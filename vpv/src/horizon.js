// Horizon profiles from extruded prisms. For a plan position, every obstacle edge crossed by a ray in
// each azimuth bin gives a (distance, top height) hit. The horizon elevation at height z is then
// max atan((h − z) / d) over the hits, so one column of facade samples shares one ray cast.
export const BINS = 72;                 // 5° azimuth bins
export const BIN_DEG = 360 / BINS;
const DEG = Math.PI / 180;

/** Flatten prisms into edges with their top height, keeping only those within maxDist of (cx, cy). */
export function obstacleEdges(prisms, cx, cy, maxDist = 500) {
  const edges = [];
  for (const p of prisms) {
    const r = p.ring;
    for (let i = 0; i < r.length; i++) {
      const a = r[i], b = r[(i + 1) % r.length];
      const mx = (a[0] + b[0]) / 2 - cx, my = (a[1] + b[1]) / 2 - cy;
      if (Math.hypot(mx, my) > maxDist + Math.hypot(b[0] - a[0], b[1] - a[1])) continue;
      edges.push({ ax: a[0], ay: a[1], bx: b[0], by: b[1], h: p.zMax });
    }
  }
  return edges;
}

/** Ray casts from (px, py): per bin, the Pareto set of hits (nearer or taller survive). */
export function columnHits(px, py, edges, maxDist = 500) {
  const hits = Array.from({ length: BINS }, () => []);
  for (const e of edges) {
    const ax = e.ax - px, ay = e.ay - py, bx = e.bx - px, by = e.by - py;
    if (Math.min(Math.hypot(ax, ay), Math.hypot(bx, by)) > maxDist && segDist(ax, ay, bx, by) > maxDist) continue;
    let a1 = Math.atan2(ax, ay) / DEG, a2 = Math.atan2(bx, by) / DEG;
    let span = ((a2 - a1) % 360 + 540) % 360 - 180;     // signed shortest angular span
    if (Math.abs(span) < 1e-9) continue;
    const from = span > 0 ? a1 : a1 + span, width = Math.abs(span);
    const b0 = Math.ceil(from / BIN_DEG - 0.5), b1 = Math.floor((from + width) / BIN_DEG - 0.5);
    for (let k = b0; k <= b1; k++) {
      const bin = ((k % BINS) + BINS) % BINS, th = (bin + 0.5) * BIN_DEG * DEG;
      const dx = Math.sin(th), dy = Math.cos(th);
      // ray t·(dx,dy) meets segment a + s·(b − a)
      const ex = bx - ax, ey = by - ay, den = dx * ey - dy * ex;
      if (Math.abs(den) < 1e-12) continue;
      const t = (ax * ey - ay * ex) / den, s = (ax * dy - ay * dx) / den;
      if (t <= 0.05 || s < -1e-9 || s > 1 + 1e-9 || t > maxDist) continue;
      addHit(hits[bin], t, e.h);
    }
  }
  return hits;
}

function addHit(list, d, h) {
  for (const o of list) if (o.d <= d && o.h >= h) return;
  for (let i = list.length - 1; i >= 0; i--) if (d <= list[i].d && h >= list[i].h) list.splice(i, 1);
  list.push({ d, h });
}

function segDist(ax, ay, bx, by) {
  const ex = bx - ax, ey = by - ay, l2 = ex * ex + ey * ey;
  const s = l2 ? Math.max(0, Math.min(1, -(ax * ex + ay * ey) / l2)) : 0;
  return Math.hypot(ax + s * ex, ay + s * ey);
}

/** Horizon elevation angles (degrees) per bin for a point at height z. */
export function horizonAt(hits, z) {
  const out = new Float32Array(BINS);
  for (let b = 0; b < BINS; b++) {
    let m = 0;
    for (const { d, h } of hits[b]) if (h > z) { const e = Math.atan2(h - z, d) / DEG; if (e > m) m = e; }
    out[b] = m;
  }
  return out;
}

// Sky directions for view-factor integration: per bin, elevation steps of 3°.
const EL_STEP = 3, EL_N = 90 / EL_STEP;
const SKY = [];
for (let b = 0; b < BINS; b++) {
  const th = (b + 0.5) * BIN_DEG * DEG;
  for (let k = 0; k < EL_N; k++) {
    const el = (k + 0.5) * EL_STEP;
    const ce = Math.cos(el * DEG);
    SKY.push({ b, el, x: ce * Math.sin(th), y: ce * Math.cos(th), z: Math.sin(el * DEG), w: ce * (EL_STEP * DEG) * (BIN_DEG * DEG) / Math.PI });
  }
}

/** Isotropic sky view factor of a surface with unit normal n behind the given horizon (1 = horizontal, open). */
export function skyViewFactor(n, horizon) {
  let s = 0;
  for (const d of SKY) {
    if (d.el <= horizon[d.b]) continue;
    const c = n[0] * d.x + n[1] * d.y + n[2] * d.z;
    if (c > 0) s += c * d.w;
  }
  return s;
}
