// Sample grids on the target building: facade cells per wall edge, roof cells per roof. Cells whose
// sample point lies inside another solid (party walls, a taller part of the same building) are dropped.
import { pointInRing, bbox, azimuthOf, orientationGroup, signedArea } from './geo.js';

const OFFSET = 0.3; // sample point distance in front of the surface (m)

export function insideAnySolid(prisms, x, y, z, skip) {
  for (const p of prisms) {
    if (p === skip || z < p.zMin || z > p.zMax) continue;
    if (pointInRing(x, y, p.ring)) return true;
  }
  return false;
}

/**
 * opts: { excludeBelowM, maxFacadeCells, maxRoofCells }
 * Returns { facade: [{x,y,z,col,az,group,area,w,h,edge,prism,u,...}], roof: [...], columns: [{x,y}] }.
 */
export function sampleTarget(scene, { excludeBelowM = 7, maxFacadeCells = 2600, maxRoofCells = 700 } = {}) {
  const T = scene.prisms.filter(p => p.target);
  let facadeArea = 0, roofArea = 0;
  for (const p of T) {
    roofArea += signedArea(p.ring);
    for (let i = 0; i < p.ring.length; i++) { const a = p.ring[i], b = p.ring[(i + 1) % p.ring.length]; facadeArea += Math.hypot(b[0] - a[0], b[1] - a[1]) * (p.zMax - p.zMin); }
  }
  const s = Math.max(3, Math.sqrt(facadeArea / maxFacadeCells));
  const rs = Math.max(2, Math.sqrt(roofArea / maxRoofCells));
  const facade = [], roof = [], columns = [];
  let edgeId = 0;
  for (const p of T) {
    const r = p.ring;
    for (let i = 0; i < r.length; i++, edgeId++) {
      const a = r[i], b = r[(i + 1) % r.length];
      const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (L < 1) continue;
      const ux = (b[0] - a[0]) / L, uy = (b[1] - a[1]) / L;
      const nx = uy, ny = -ux; // outward for a CCW ring
      const az = azimuthOf(nx, ny), group = orientationGroup(az);
      const nCols = Math.max(1, Math.round(L / s)), w = L / nCols;
      const z0 = Math.max(p.zMin, 0), H = p.zMax - z0;
      if (H < 1) continue;
      const nRows = Math.max(1, Math.round(H / s)), h = H / nRows;
      for (let c = 0; c < nCols; c++) {
        const t = (c + 0.5) * w;
        const x = a[0] + ux * t + nx * OFFSET, y = a[1] + uy * t + ny * OFFSET;
        const colIdx = columns.length; let used = false;
        for (let k = 0; k < nRows; k++) {
          const z = z0 + (k + 0.5) * h;
          if (insideAnySolid(scene.prisms, x, y, z)) continue;
          used = true;
          facade.push({
            x, y, z, col: colIdx, az, group, area: w * h, excluded: z < excludeBelowM,
            // quad corners for drawing (on the wall plane)
            quad: [[a[0] + ux * (t - w / 2), a[1] + uy * (t - w / 2), z - h / 2], [a[0] + ux * (t + w / 2), a[1] + uy * (t + w / 2), z - h / 2],
              [a[0] + ux * (t + w / 2), a[1] + uy * (t + w / 2), z + h / 2], [a[0] + ux * (t - w / 2), a[1] + uy * (t - w / 2), z + h / 2]],
            edge: edgeId,
          });
        }
        if (used) columns.push({ x, y }); // index colIdx: nothing else is pushed in between
      }
    }
    // roof grid
    const [x0, y0, x1, y1] = bbox(r);
    const z = p.zMax + 0.3;
    for (let x = x0 + rs / 2; x < x1; x += rs) for (let y = y0 + rs / 2; y < y1; y += rs) {
      if (!pointInRing(x, y, r) || insideAnySolid(scene.prisms, x, y, z)) continue;
      roof.push({ x, y, z, area: rs * rs, group: 'roof', quad: [[x - rs / 2, y - rs / 2, p.zMax], [x + rs / 2, y - rs / 2, p.zMax], [x + rs / 2, y + rs / 2, p.zMax], [x - rs / 2, y + rs / 2, p.zMax]] });
    }
  }
  return { facade, roof, columns, cellSizeM: s, roofCellM: rs };
}
