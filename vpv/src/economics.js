// Load profile, self-consumption and lifetime economics (NPV, IRR, LCOE, payback) in three cases:
// 0 = conservative, 1 = central, 2 = optimistic.
export const CASES = ['conservative', 'central', 'optimistic'];

/** Hourly load (kWh) with the given annual total. Israeli work week Sunday–Thursday; summer cooling peak. */
export function loadProfile(kind, annualKwh, clim) {
  const out = new Float32Array(8760);
  const season = m => (m >= 5 && m <= 8 ? 1.3 : m === 11 || m <= 1 ? 1.1 : 1);
  let sum = 0;
  for (let i = 0; i < 8760; i++) {
    const h = clim.localHour[i], d = clim.weekday[i], m = clim.month[i];
    let v;
    if (kind === 'office') {
      const work = d <= 4 ? h >= 7 && h < 19 : d === 5 ? h >= 8 && h < 13 : false;
      v = work ? 1 : 0.28;
    } else if (kind === 'hotel') v = 0.7 + (h >= 6 && h < 10 ? 0.25 : 0) + (h >= 17 && h < 23 ? 0.35 : 0);
    else v = 0.85 + (h >= 8 && h < 20 ? 0.25 : 0);
    v *= season(m);
    out[i] = v; sum += v;
  }
  for (let i = 0; i < 8760; i++) out[i] *= annualKwh / sum;
  return out;
}

const pick = (arr, ci) => (Array.isArray(arr) ? arr[ci] : arr);
const costPick = (arr, ci) => (Array.isArray(arr) ? arr[2 - ci] : arr); // [low, mid, high]: conservative pays high

/**
 * items: [{ hourly (kWh), kwp, areaM2, tech, isFacade, coolingKwhYr }]
 * Returns metrics for one case.
 */
export function evaluate(items, load, econ, ci) {
  const r = pick(econ.discountRate, ci), N = econ.lifetimeYr;
  const pSelf = pick(econ.selfConsumedIlsPerKwh, ci), pExp = pick(econ.exportIlsPerKwh, ci);
  const gen = new Float32Array(8760);
  let capex = 0, opex = 0, kwp = 0, area = 0, cooling = 0, invRepl = 0;
  const perItem = [];
  for (const it of items) {
    const gf = pick(econ.generationFactor[it.isFacade ? 'facade' : 'roof'], ci);
    let e = 0;
    for (let i = 0; i < 8760; i++) { const v = it.hourly[i] * gf; gen[i] += v; e += v; }
    perItem.push({ e, deg: it.tech.degradation, life: Math.min(N, it.tech.lifetimeYr ?? N) });
    capex += it.kwp * costPick(it.tech.capexIlsPerKwp, ci) - (it.renewalCredit ? it.areaM2 * pick(it.tech.renewalCreditIlsPerM2, ci) : 0);
    opex += it.areaM2 * costPick(it.tech.opexIlsPerM2Yr, ci);
    invRepl += it.kwp * pick(econ.inverterReplacementIlsPerKwp, ci);
    kwp += it.kwp; area += it.areaM2; cooling += (it.coolingKwhYr || 0) * gf;
  }
  let genKwh = 0, selfKwh = 0;
  for (let i = 0; i < 8760; i++) { genKwh += gen[i]; selfKwh += Math.min(gen[i], load[i]); }
  const exportKwh = genKwh - selfKwh, selfShare = genKwh ? selfKwh / genKwh : 0;
  const valuePerKwh = genKwh ? (selfKwh * pSelf + exportKwh * pExp) / genKwh : pSelf;

  const flows = [-capex], energy = [0];
  for (let y = 1; y <= N; y++) {
    let ey = 0;
    for (const p of perItem) if (y <= p.life) ey += p.e * (1 - p.deg) ** (y - 1);
    const coolY = cooling * (genKwh ? ey / genKwh : 0);
    let f = ey * valuePerKwh + coolY * pSelf - opex;
    if (y === econ.inverterReplacementYr) f -= invRepl;
    flows.push(f); energy.push(ey);
  }
  const npvAt = rate => flows.reduce((s, f, y) => s + f / (1 + rate) ** y, 0);
  const npv = npvAt(r);
  const pvEnergy = energy.reduce((s, e, y) => s + e / (1 + r) ** y, 0);
  const pvCost = capex + flows.slice(1).reduce((s, f, k) => {
    const y = k + 1; const cost = opex + (y === econ.inverterReplacementYr ? invRepl : 0);
    return s + cost / (1 + r) ** y;
  }, 0);
  let payback = null, cum = flows[0];
  for (let y = 1; y <= N; y++) { const prev = cum; cum += flows[y]; if (cum >= 0 && flows[y] > 0) { payback = y - 1 + -prev / flows[y]; break; } }
  return {
    case: CASES[ci], kwp, areaM2: area, capex, opexYr: opex, genKwhYr: genKwh, selfKwh, exportKwh, selfShare, coolingKwhYr: cooling,
    revenueYr1: genKwh * valuePerKwh + cooling * pSelf, valuePerKwh,
    npv, irr: irr(flows), payback, lcoe: pvEnergy ? pvCost / pvEnergy : null, discountRate: r,
  };
}

export function irr(flows) {
  const f = rate => flows.reduce((s, v, y) => s + v / (1 + rate) ** y, 0);
  let lo = -0.9, hi = 1;
  if (f(lo) * f(hi) > 0) return null;
  for (let k = 0; k < 100; k++) { const m = (lo + hi) / 2; if (f(lo) * f(m) <= 0) hi = m; else lo = m; }
  return (lo + hi) / 2;
}

/** All three cases. */
export const evaluateRange = (items, load, econ) => [0, 1, 2].map(ci => evaluate(items, load, econ, ci));
