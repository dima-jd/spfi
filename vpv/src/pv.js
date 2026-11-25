// PV output from hourly plane-of-array irradiance: Faiman cell temperature, linear temperature
// coefficient, fixed loss chain and inverter efficiency (PVWatts-style). Output in kWh per hour.

/** Installable module area (m²) for one technology on one surface group. */
export function installableArea(tech, group, wwr, model) {
  const A = group.suitableArea;
  if (group.id === 'roof') {
    const usable = A * model.roof.usableShare;
    if (tech.slot === 'roof') return usable * tech.groundCoverRatio;
    return usable * (tech.roofCoverage ?? 0);
  }
  if (tech.slot === 'window') return (tech.orientations || []).includes(group.id) ? A * wwr * tech.bladeAreaPerWindowArea : 0;
  return A * (1 - wwr) * tech.installableShareOfOpaque;
}

/** Which irradiance plane a technology uses on a group: rack/louvre planes are the group's secondary. */
export const planeFor = (tech, group) => (group.id === 'roof' ? (tech.slot === 'roof' ? group.secondary : group.primary) : tech.slot === 'window' ? group.secondary : group.primary);

export function lossFactor(tech, isFacade, L) {
  let f = (1 - L.wiringMismatch) * (1 - L.availability) * L.inverterEff;
  f *= 1 - (isFacade ? L.soilingFacade : L.soilingRoof);
  if (isFacade) f *= 1 - L.facadeNonUniformity;
  if (tech.rowShadingLoss) f *= 1 - tech.rowShadingLoss;
  return f;
}

/** Hourly AC energy (kWh) for areaM2 of a technology under plane irradiance acc ({ poa, eff } W/m²). */
export function simulate(acc, clim, tech, areaM2, isFacade, losses) {
  const out = new Float32Array(8760);
  if (!areaM2) return { hourly: out, annualKwh: 0, kwp: 0, specificYield: 0, meanCellTempC: null };
  const lf = lossFactor(tech, isFacade, losses);
  let total = 0, tSum = 0, tW = 0;
  for (let i = 0; i < 8760; i++) {
    const g = acc.poa[i];
    if (g <= 0) continue;
    const tc = clim.t2m[i] + g / (tech.faimanU0 + tech.faimanU1 * clim.ws[i]);
    const w = acc.eff[i] * tech.moduleEff * (1 + tech.gammaPerC * (tc - 25)) * areaM2 * lf / 1000;
    out[i] = Math.max(0, w); total += out[i]; tSum += tc * g; tW += g;
  }
  const kwp = areaM2 * tech.moduleEff;
  return { hourly: out, annualKwh: total, kwp, specificYield: total / kwp, meanCellTempC: tW ? tSum / tW : null };
}

/** Avoided cooling electricity (kWh/yr) from louvres shading the windows behind them (indicative). */
export function coolingCredit(acc, clim, tech, bladeAreaM2) {
  const cc = tech.coolingCredit;
  if (!cc || !bladeAreaM2) return 0;
  const windowArea = bladeAreaM2 / tech.bladeAreaPerWindowArea;
  // acc here is the facade (vertical) plane: solar heat that would have entered through glazing
  let wh = 0;
  for (let i = 0; i < 8760; i++) if (clim.t2m[i] >= cc.minAirTempC) wh += acc.poa[i];
  return (wh / 1000) * windowArea * cc.shgc * cc.blockedShare / cc.cop;
}
