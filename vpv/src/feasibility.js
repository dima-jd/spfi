// Retrofit Feasibility Score: five categories scored 0–100 from survey answers and building facts.
// Critical issues do not lower the score; they block the affected options outright.

export const QUESTIONS = [
  { id: 'structuralDocs', cat: 'structure', label: 'Structural drawings and calculations available', options: { yes: 100, unknown: 50, no: 20 } },
  { id: 'facadeCondition', cat: 'structure', label: 'Condition of the facade and its anchors', options: { good: 100, fair: 60, unknown: 50, poor: 0 } },
  { id: 'roofLoadReserve', cat: 'structure', label: 'Roof has spare load capacity for racking (~25 kg/m²)', options: { yes: 100, unknown: 50, no: 30 } },
  { id: 'fireReview', cat: 'fire', label: 'Fire engineer has accepted the facade PV product class', options: { cleared: 100, unknown: 40, 'not-done': 20 } },
  { id: 'facadeAccess', cat: 'maintenance', label: 'Facade access for cleaning and repair', options: { bmu: 100, rope: 70, unknown: 50, none: 10 } },
  { id: 'electricalRoom', cat: 'connection', label: 'Space for inverters and metering in the electrical room', options: { yes: 100, unknown: 50, no: 20 } },
  { id: 'gridCapacity', cat: 'connection', label: 'Connection capacity confirmed with the utility', options: { yes: 100, unknown: 50, no: 20 } },
  { id: 'ownership', cat: 'ownership', label: 'Who controls the facade and roof', options: { single: 100, public: 80, unknown: 50, condominium: 40 } },
  { id: 'heritage', cat: 'ownership', label: 'Listed for conservation', options: { no: 100, unknown: 60, yes: 10 } },
];
export const CATEGORIES = [
  { id: 'structure', label: 'Wind and structural strength' },
  { id: 'fire', label: 'Fire safety' },
  { id: 'maintenance', label: 'Maintenance' },
  { id: 'connection', label: 'Connection' },
  { id: 'ownership', label: 'Ownership and permissions' },
];

export function defaultAnswers(scene) {
  const a = Object.fromEntries(QUESTIONS.map(q => [q.id, 'unknown']));
  if (scene?.target?.use === 'residential') a.ownership = 'condominium';
  if (scene?.target?.heritage) a.heritage = 'yes';
  return a;
}

const FACADE_SLOTS = new Set(['opaque', 'window']);

/** Critical blockers for one option. */
export function blockersFor(tech, slot, building, answers, cfg) {
  const out = [], facade = FACADE_SLOTS.has(slot);
  if (facade && tech.combustible && building.heightM > cfg.highRiseM && answers.fireReview !== 'cleared')
    out.push({ cat: 'fire', text: `Combustible facade product on a building taller than ${cfg.highRiseM} m without an accepted fire classification` });
  if (facade && answers.facadeCondition === 'poor') out.push({ cat: 'structure', text: 'Facade or anchors in poor condition: repair before adding load' });
  if (facade && answers.heritage === 'yes') out.push({ cat: 'ownership', text: 'Conservation-listed facade' });
  if (slot === 'roof' && tech.weightKgM2 > 10 && answers.roofLoadReserve === 'no') out.push({ cat: 'structure', text: 'No spare roof load capacity for racking' });
  return out;
}

/** building: { heightM, kwp (proposed) }. Returns score, categories, checks. */
export function assessFeasibility(building, answers, cfg) {
  const cats = Object.fromEntries(CATEGORIES.map(c => [c.id, { ...c, items: [] }]));
  for (const q of QUESTIONS) {
    const v = answers[q.id] ?? 'unknown';
    cats[q.cat].items.push({ id: q.id, label: q.label, value: v, score: q.options[v] ?? 50 });
  }
  const H = building.heightM;
  cats.structure.items.push({ id: 'height', label: `Wind exposure at ${Math.round(H)} m`, value: 'auto', score: H > 100 ? 40 : H > 60 ? 60 : H > 30 ? 75 : 90 });
  cats.fire.items.push({ id: 'fireHeight', label: H > cfg.highRiseM ? `Above ${cfg.highRiseM} m: stricter facade fire rules` : `Up to ${cfg.highRiseM} m`, value: 'auto', score: H > cfg.highRiseM ? 50 : 90 });
  cats.maintenance.items.push({ id: 'accessHeight', label: H > cfg.bmuRequiredAboveM ? `Above ${cfg.bmuRequiredAboveM} m: needs a gondola (BMU) or rope access` : 'Reachable with lifts or scaffolding', value: 'auto', score: H > cfg.bmuRequiredAboveM ? (answers.facadeAccess === 'bmu' ? 90 : 50) : 85 });
  if (building.kwp != null) cats.connection.items.push({ id: 'size', label: `Proposed ${Math.round(building.kwp)} kWp`, value: 'auto', score: building.kwp > cfg.connectionStudyAboveKwp ? 60 : 90 });

  const categories = CATEGORIES.map(c => {
    const it = cats[c.id].items;
    return { ...cats[c.id], score: Math.round(it.reduce((s, x) => s + x.score, 0) / it.length) };
  });
  const score = Math.round(categories.reduce((s, c) => s + c.score, 0) / categories.length);

  const checks = [];
  const ask = (cond, text) => cond && checks.push(text);
  ask(true, 'Structural engineer: wind loads (Israeli Standard 414) and anchor design for every facade system');
  ask(answers.structuralDocs !== 'yes', 'Obtain the structural drawings and calculations');
  ask(answers.facadeCondition === 'unknown', 'Facade survey: condition of cladding, curtain wall and anchors');
  ask(answers.roofLoadReserve !== 'yes', 'Roof load check for racking, ballast and wind uplift');
  ask(answers.fireReview !== 'cleared', 'Fire engineer: reaction-to-fire class of modules and substructure, spread between floors, firefighter access');
  ask(answers.facadeAccess === 'unknown' || answers.facadeAccess === 'none', 'Maintenance plan: gondola (BMU), rope access or lifts, and its yearly cost');
  ask(answers.electricalRoom !== 'yes', 'Electrical survey: inverter, cable routes and meter location');
  ask(answers.gridCapacity !== 'yes', building.kwp > cfg.connectionStudyAboveKwp ? 'Utility connection study (proposed system above ' + cfg.connectionStudyAboveKwp + ' kWp)' : 'Confirm connection capacity with the utility');
  ask(answers.ownership === 'condominium', 'Owners’ approval under the condominium rules and an agreement on sharing savings');
  ask(answers.ownership === 'unknown', 'Confirm who owns and controls the facade and roof');
  ask(answers.heritage !== 'no', 'Check conservation status and planning permission for facade changes');
  ask(true, 'Measure real electricity consumption (15-minute meter data) to replace the modelled profile');
  ask(true, 'Check the building model (height and neighbours from OpenStreetMap) against drawings or a site survey');
  return { score, grade: score >= 75 ? 'good' : score >= 50 ? 'fair' : 'weak', categories, checks };
}
