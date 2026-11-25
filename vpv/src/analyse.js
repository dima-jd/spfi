// Whole-building analysis: solar simulation → options per surface and technology → scenarios → verdict.
import { analyseSolar, GROUPS } from './irradiance.js';
import { installableArea, planeFor, simulate, coolingCredit } from './pv.js';
import { loadProfile, evaluateRange } from './economics.js';
import { assessFeasibility, blockersFor, defaultAnswers } from './feasibility.js';
import { signedArea } from './geo.js';
import { LEVEL_HEIGHT_M } from './scene.js';

export const SCENARIOS = [
  { id: 'best-value', label: 'Best value', hint: 'Highest net present value' },
  { id: 'facades', label: 'Facades only', hint: 'Best-value option on each facade, roof left out' },
  { id: 'max-generation', label: 'Maximum generation', hint: 'Every feasible surface above the irradiance threshold' },
  { id: 'fastest-payback', label: 'Fastest payback', hint: 'Shortest payback per surface' },
  { id: 'cheapest', label: 'Cheapest energy', hint: 'Lowest cost per kWh, only below the value of the electricity' },
  { id: 'min-weight', label: 'Minimum weight', hint: 'Lightest option that still pays back' },
  { id: 'architecture', label: 'Architectural integration', hint: 'Best-integrated option that still pays back' },
];

/** Floor area estimate from the target prisms (footprint × storeys). */
export function floorArea(scene) {
  return scene.prisms.filter(p => p.target).reduce((s, p) => s + signedArea(p.ring) * Math.max(1, Math.round((p.zMax - p.zMin) / LEVEL_HEIGHT_M)), 0);
}

const slotKey = (g, slot) => (g === 'roof' ? 'roof' : `${g}:${slot}`);

/**
 * scene, clim (prepared), model (config/model.json).
 * inputs: { use, wwr, annualLoadKwh, facadeRenewal: 'no' | 'planned', answers, solar } — solar lets the UI reuse a finished solar run.
 */
export function analyseBuilding(scene, clim, model, inputs = {}) {
  const scr = model.screening;
  const solar = inputs.solar || analyseSolar(scene, clim, { facadeMinKwhM2: scr.facadeMinKwhM2, roofMinKwhM2: scr.roofMinKwhM2, excludeBelowM: scr.excludeBelowM });
  const use = inputs.use || scene.target.use || 'office';
  const U = model.buildingUse[use] || model.buildingUse.office;
  const wwr = inputs.wwr ?? U.wwr;
  const gfa = floorArea(scene);
  const annualLoadKwh = inputs.annualLoadKwh ?? Math.round(gfa * U.eui);
  const load = loadProfile(U.profile, annualLoadKwh, clim);
  const answers = { ...defaultAnswers(scene), ...(inputs.answers || {}) };
  const building = { heightM: scene.target.heightM };
  const econ = model.economics;
  const renewal = inputs.facadeRenewal === 'planned';

  // Options: one per (group, technology) with installable area.
  const options = [];
  for (const gid of GROUPS) {
    const G = solar.groups[gid];
    for (const [tid, tech] of Object.entries(model.technologies)) {
      const slot = gid === 'roof' ? (tech.slot === 'roof' || tech.roofCoverage ? 'roof' : null) : tech.slot === 'roof' ? null : tech.slot;
      if (!slot) continue;
      const area = installableArea(tech, G, wwr, model);
      if (area < 1) continue;
      const isFacade = gid !== 'roof';
      const sim = simulate(planeFor(tech, G), clim, tech, area, isFacade, model.losses);
      const coolingKwhYr = tech.slot === 'window' ? coolingCredit(G.primary, clim, tech, area) : 0;
      const item = { hourly: sim.hourly, kwp: sim.kwp, areaM2: area, tech, isFacade, coolingKwhYr, renewalCredit: renewal && isFacade && !!tech.renewalCreditIlsPerM2 };
      const range = evaluateRange([item], load, econ);
      options.push({
        id: `${gid}:${tid}`, group: gid, slot, slotKey: slotKey(gid, slot), techId: tid, tech: { label: tech.label, short: tech.short, weightKgM2: tech.weightKgM2, architecture: tech.architecture },
        areaM2: area, kwp: sim.kwp, annualKwh: sim.annualKwh, specificYield: sim.specificYield, poaKwhM2: planeFor(tech, G).annual, coolingKwhYr,
        weightKg: area * tech.weightKgM2, blockers: blockersFor(tech, slot, building, answers, model.feasibility),
        range, item,
      });
    }
  }

  const c = o => o.range[1];
  const pays = o => c(o).payback != null && c(o).payback <= scr.maxPaybackYr;
  const choosers = {
    'best-value': list => best(list.filter(o => c(o).npv > 0), o => c(o).npv),
    facades: list => best(list.filter(o => o.group !== 'roof' && c(o).npv > 0), o => c(o).npv),
    'max-generation': list => best(list, o => o.annualKwh),
    'fastest-payback': list => best(list.filter(pays), o => -c(o).payback),
    cheapest: list => best(list.filter(o => c(o).lcoe != null && c(o).lcoe < c(o).valuePerKwh), o => -c(o).lcoe),
    'min-weight': list => best(list.filter(pays), o => -o.tech.weightKgM2 * 1e6 + c(o).npv / 1e3),
    architecture: list => best(list.filter(pays), o => o.tech.architecture * 1e9 + c(o).npv),
  };
  const bySlot = new Map();
  for (const o of options) if (!o.blockers.length) (bySlot.get(o.slotKey) || bySlot.set(o.slotKey, []).get(o.slotKey)).push(o);

  const scenarios = SCENARIOS.map(s => {
    const chosen = [];
    for (const list of bySlot.values()) { const o = choosers[s.id](list); if (o) chosen.push(o); }
    const range = chosen.length ? evaluateRange(chosen.map(o => o.item), load, econ) : null;
    const weightKg = chosen.reduce((t, o) => t + o.weightKg, 0);
    return { ...s, options: chosen.map(o => o.id), range, weightKg };
  });

  const viable = scenarios.filter(s => s.range);
  const recommended = viable.length ? viable.reduce((a, b) => (b.range[1].npv > a.range[1].npv ? b : a)) : null;
  const R = recommended?.range;
  const anyBlocked = options.some(o => o.blockers.length);
  const verdict = !options.length ? 'no-surface'
    : !R ? (options.every(o => o.blockers.length) ? 'blocked' : 'not-viable')
      : R[0].npv > 0 ? 'promising' : R[1].npv > 0 ? 'marginal' : 'not-viable';
  // Facade verdict: the research question. Judged on the best unblocked facade option on its own.
  const facadeBest = best(options.filter(o => o.group !== 'roof' && !o.blockers.length), o => c(o).npv);
  const facadeVerdict = !options.some(o => o.group !== 'roof') ? 'no-surface'
    : !facadeBest ? 'blocked'
      : facadeBest.range[0].npv > 0 ? 'promising' : c(facadeBest).npv > 0 ? 'marginal' : 'not-viable';
  const feasibility = assessFeasibility({ ...building, kwp: R ? R[1].kwp : 0 }, answers, model.feasibility);

  return {
    scene: { id: scene.id, name: scene.name, nameHe: scene.nameHe, city: scene.city, origin: scene.origin, target: scene.target, source: scene.source },
    inputs: { use, useLabel: U.label, wwr, annualLoadKwh, facadeRenewal: renewal ? 'planned' : 'no', floorAreaM2: Math.round(gfa), meter: U.selfConsumptionMeter, answers },
    solar, options, scenarios, recommended: recommended?.id ?? null, verdict, facadeVerdict, facadeBest: facadeBest?.id ?? null, anyBlocked, feasibility,
    climate: clim.meta,
  };
}

function best(list, score) {
  let b = null, bs = -Infinity;
  for (const o of list) { const s = score(o); if (s > bs) { bs = s; b = o; } }
  return b;
}

export const VERDICT = {
  promising: 'Promising: pays back even in the conservative case',
  marginal: 'Marginal: pays back in the central case only',
  'not-viable': 'Not viable at current assumptions',
  blocked: 'Blocked by critical issues',
  'no-surface': 'No suitable surface found',
};
