// Hourly plane-of-array irradiance on every sample cell for a full typical year, with shading from the
// horizon profile (beam and circumsolar blocked when the sun is behind an obstacle; isotropic sky
// diffuse scaled by the obstructed sky view factor). Transposition: Hay–Davies.
import { obstacleEdges, columnHits, horizonAt, skyViewFactor, BINS, BIN_DEG } from './horizon.js';
import { surfaceNormal } from './sun.js';
import { sampleTarget } from './surfaces.js';
import { centroid } from './geo.js';

export const SOLAR_DEFAULTS = {
  albedo: 0.2, louvreTiltDeg: 30, rackTiltDeg: 20, rackAzimuthDeg: 180,
  facadeMinKwhM2: 650, roofMinKwhM2: 1300, iamAr: 0.16, diffuseIam: 0.95, excludeBelowM: 7, maxDistM: 500,
};
export const GROUPS = ['roof', 'S', 'E', 'W', 'N'];

const iam = (c, ar) => (c <= 0 ? 0 : (1 - Math.exp(-c / ar)) / (1 - Math.exp(-1 / ar)));

/** One cell, one plane: annual sum (Wh/m²) and, when acc is given, hourly accumulation of raw and IAM-weighted POA × weight. */
function runPlane(n, hor, svf, clim, cfg, acc, w) {
  const groundF = cfg.albedo * (1 - n[2]) / 2;
  let total = 0;
  for (const h of clim.day) {
    const c = n[0] * h.sx + n[1] * h.sy + n[2] * h.sz;
    const bin = Math.min(BINS - 1, Math.floor(h.az / BIN_DEG));
    const sunVisible = h.el > hor[bin];
    let beam = 0, circ = 0;
    if (sunVisible && c > 0) { beam = h.dni * c; circ = h.dhi * h.ai * c / Math.max(h.sz, 0.087); }
    const iso = h.dhi * (1 - h.ai) * svf, ground = h.ghi * groundF;
    const poa = beam + circ + iso + ground;
    total += poa;
    if (acc) {
      acc.poa[h.i] += poa * w;
      acc.eff[h.i] += ((beam + circ) * iam(c, cfg.iamAr) + (iso + ground) * cfg.diffuseIam) * w;
    }
  }
  return total;
}

const newAcc = () => ({ poa: new Float32Array(8760), eff: new Float32Array(8760), area: 0 });

/**
 * Full solar analysis of a scene's target building.
 * Returns { cells: { facade, roof }, groups: { roof|S|E|W|N: {...} }, cfg }.
 */
export function analyseSolar(scene, clim, options = {}) {
  const cfg = { ...SOLAR_DEFAULTS, ...options };
  const sm = sampleTarget(scene, { excludeBelowM: cfg.excludeBelowM });
  const tp = scene.prisms.filter(p => p.target);
  const [cx, cy] = centroid(tp[0].ring);
  const edges = obstacleEdges(scene.prisms, cx, cy, cfg.maxDistM + 200);

  // Facade: one ray cast per column, horizon per cell height.
  const colHits = sm.columns.map(c => columnHits(c.x, c.y, edges, cfg.maxDistM));
  const facade = sm.facade.map(p => {
    const hor = horizonAt(colHits[p.col], p.z);
    const nV = surfaceNormal(90, p.az), nL = surfaceNormal(cfg.louvreTiltDeg, p.az);
    const svfV = skyViewFactor(nV, hor), svfL = skyViewFactor(nL, hor);
    const vert = runPlane(nV, hor, svfV, clim, cfg) / 1000;
    return { ...p, hor, nV, nL, svfV, svfL, vert };
  });
  const roof = sm.roof.map(p => {
    const hor = horizonAt(columnHits(p.x, p.y, edges, cfg.maxDistM), p.z);
    const nH = [0, 0, 1], nR = surfaceNormal(cfg.rackTiltDeg, cfg.rackAzimuthDeg);
    const svfH = skyViewFactor(nH, hor), svfR = skyViewFactor(nR, hor);
    const hor_ = runPlane(nH, hor, svfH, clim, cfg) / 1000;
    return { ...p, hor, nH, nR, svfH, svfR, horiz: hor_ };
  });

  // Suitability and hourly aggregation of suitable cells per group.
  const groups = {};
  for (const g of GROUPS) groups[g] = { id: g, cells: 0, grossArea: 0, eligibleArea: 0, suitableArea: 0, sumAnnual: 0, primary: newAcc(), secondary: newAcc() };
  for (const p of facade) {
    const G = groups[p.group];
    G.cells++; G.grossArea += p.area; G.sumAnnual += p.vert * p.area;
    if (p.excluded) continue;
    G.eligibleArea += p.area;
    p.suitable = p.vert >= cfg.facadeMinKwhM2;
    if (!p.suitable) continue;
    G.suitableArea += p.area;
    runPlane(p.nV, p.hor, p.svfV, clim, cfg, G.primary, p.area);
    p.louv = runPlane(p.nL, p.hor, p.svfL, clim, cfg, G.secondary, p.area) / 1000;
  }
  for (const p of roof) {
    const G = groups.roof;
    G.cells++; G.grossArea += p.area; G.eligibleArea += p.area; G.sumAnnual += p.horiz * p.area;
    p.suitable = p.horiz >= cfg.roofMinKwhM2;
    if (!p.suitable) continue;
    G.suitableArea += p.area;
    runPlane(p.nH, p.hor, p.svfH, clim, cfg, G.primary, p.area);
    p.rack = runPlane(p.nR, p.hor, p.svfR, clim, cfg, G.secondary, p.area) / 1000;
  }
  for (const G of Object.values(groups)) {
    G.meanAnnual = G.grossArea ? G.sumAnnual / G.grossArea : 0;
    for (const acc of [G.primary, G.secondary]) {
      acc.area = G.suitableArea;
      if (G.suitableArea) for (let i = 0; i < 8760; i++) { acc.poa[i] /= G.suitableArea; acc.eff[i] /= G.suitableArea; }
      acc.annual = acc.poa.reduce((s, v) => s + v, 0) / 1000;
    }
    G.primary.plane = G.id === 'roof' ? 'horizontal' : 'facade';
    G.secondary.plane = G.id === 'roof' ? `rack ${cfg.rackTiltDeg}° south` : `louvre ${cfg.louvreTiltDeg}°`;
    G.suitableShare = G.eligibleArea ? G.suitableArea / G.eligibleArea : 0;
    delete G.sumAnnual;
  }
  return { cells: { facade, roof }, groups, cfg, cellSizeM: sm.cellSizeM, roofCellM: sm.roofCellM };
}
