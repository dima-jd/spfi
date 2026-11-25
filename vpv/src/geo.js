// Local metric plane around a scene origin (x east, y north, metres). Equirectangular is accurate to
// well under 0.1% within the ~500 m radius of a building scene.
const R = 6371008.8, DEG = Math.PI / 180;

export function makeProjection(lat0, lon0) {
  const kx = R * DEG * Math.cos(lat0 * DEG), ky = R * DEG;
  return {
    toLocal: (lon, lat) => [(lon - lon0) * kx, (lat - lat0) * ky],
    toLonLat: (x, y) => [lon0 + x / kx, lat0 + y / ky],
  };
}

export function signedArea(ring) {
  let s = 0;
  for (let i = 0, n = ring.length; i < n; i++) {
    const [x1, y1] = ring[i], [x2, y2] = ring[(i + 1) % n];
    s += x1 * y2 - x2 * y1;
  }
  return s / 2;
}

/** Open ring (no repeated closing vertex), counter-clockwise, without near-duplicate vertices. */
export function normaliseRing(ring) {
  let r = ring.slice();
  if (r.length > 1) { const a = r[0], b = r[r.length - 1]; if (Math.hypot(a[0] - b[0], a[1] - b[1]) < 1e-6) r.pop(); }
  r = r.filter((p, i) => { const q = r[(i + r.length - 1) % r.length]; return i === 0 || Math.hypot(p[0] - q[0], p[1] - q[1]) > 0.05; });
  if (signedArea(r) < 0) r.reverse();
  return r;
}

export function pointInRing(x, y, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export function centroid(ring) {
  let a = 0, cx = 0, cy = 0;
  for (let i = 0, n = ring.length; i < n; i++) {
    const [x1, y1] = ring[i], [x2, y2] = ring[(i + 1) % n];
    const f = x1 * y2 - x2 * y1; a += f; cx += (x1 + x2) * f; cy += (y1 + y2) * f;
  }
  if (Math.abs(a) < 1e-9) { const n = ring.length; return [ring.reduce((s, p) => s + p[0], 0) / n, ring.reduce((s, p) => s + p[1], 0) / n]; }
  return [cx / (3 * a), cy / (3 * a)];
}

export function bbox(ring) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of ring) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  return [x0, y0, x1, y1];
}

/** Azimuth of a direction vector, degrees clockwise from north. */
export const azimuthOf = (dx, dy) => ((Math.atan2(dx, dy) * 180) / Math.PI + 360) % 360;

/** Compass group of an outward normal azimuth. */
export function orientationGroup(az) {
  if (az >= 315 || az < 45) return 'N';
  if (az < 135) return 'E';
  if (az < 225) return 'S';
  return 'W';
}
