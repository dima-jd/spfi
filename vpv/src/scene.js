// Building scene from OpenStreetMap (Overpass `out geom`): every building becomes one or more extruded
// prisms (ring in local metres, zMin..zMax). Where a building is mapped with building:part ways, the
// parts replace the outline (OSM Simple 3D Buildings convention).
import { makeProjection, normaliseRing, pointInRing, centroid, signedArea } from './geo.js';

export const LEVEL_HEIGHT_M = 3.2;
const DEFAULT_LEVELS = { apartments: 5, residential: 4, house: 2, detached: 2, office: 8, commercial: 4, retail: 2, hotel: 8, hospital: 6, university: 4, school: 3, garage: 1, roof: 1, shed: 1 };

const num = v => { if (v == null) return null; const m = /^\s*(-?[\d.]+)\s*(m)?\s*$/.exec(String(v).replace(',', '.')); return m ? Number(m[1]) : null; };

/** Height range of an OSM element and where it came from. */
export function heightOf(tags = {}) {
  const levels = num(tags['building:levels']), minLevel = num(tags['building:min_level']);
  let zMax = num(tags.height), src = 'height';
  if (zMax == null && levels != null) { zMax = levels * LEVEL_HEIGHT_M + (num(tags['roof:levels']) || 0) * LEVEL_HEIGHT_M; src = 'levels'; }
  if (zMax == null) { const b = tags.building || tags['building:part'] || ''; zMax = (DEFAULT_LEVELS[b] ?? 3) * LEVEL_HEIGHT_M; src = 'default'; }
  let zMin = num(tags.min_height);
  if (zMin == null && minLevel != null) zMin = minLevel * LEVEL_HEIGHT_M;
  return { zMin: Math.max(0, zMin || 0), zMax, src, levels: levels ?? (src === 'height' ? Math.round(zMax / LEVEL_HEIGHT_M) : null) };
}

function ringsOf(el, P) {
  if (el.type === 'way' && el.geometry) return [el.geometry.map(g => P.toLocal(g.lon, g.lat))];
  if (el.type === 'relation' && el.members) return el.members.filter(m => m.role === 'outer' && m.geometry).map(m => m.geometry.map(g => P.toLocal(g.lon, g.lat)));
  return [];
}

/**
 * Build a scene. osm: Overpass JSON with building and building:part ways/relations (out geom).
 * at: { lat, lon } of the target building (a point inside or near its outline).
 */
export function buildScene(osm, at, { radiusM = 350, name, id, targetOsm, use } = {}) {
  const P = makeProjection(at.lat, at.lon);
  const outlines = [], parts = [];
  for (const el of osm.elements || []) {
    const t = el.tags || {};
    const isPart = t['building:part'] && t['building:part'] !== 'no';
    const isBuilding = t.building && t.building !== 'no';
    if (!isPart && !isBuilding) continue;
    for (const raw of ringsOf(el, P)) {
      if (raw.length < 3) continue;
      const ring = normaliseRing(raw.map(([x, y]) => [Math.round(x * 100) / 100, Math.round(y * 100) / 100]));
      if (ring.length < 3 || signedArea(ring) < 4) continue;
      const rec = { osm: `${el.type}/${el.id}`, ring, tags: t, ...heightOf(t) };
      if (isPart) parts.push(rec);
      if (isBuilding) outlines.push(rec); // tagged as both: it is its own outline and its own part
    }
  }
  // Target outline: the one containing the point, else the nearest centroid within 60 m.
  let target = (targetOsm && outlines.find(o => o.osm === targetOsm)) || outlines.find(o => pointInRing(0, 0, o.ring));
  if (!target) {
    let best = Infinity;
    for (const o of outlines) { const [cx, cy] = centroid(o.ring), d = Math.hypot(cx, cy); if (d < best && d < 60) { best = d; target = o; } }
  }
  if (!target) throw new Error('No OSM building outline at this location');

  const prisms = [];
  const partsOf = o => parts.filter(p => { const [cx, cy] = centroid(p.ring); return pointInRing(cx, cy, o.ring); });
  const used = new Set();
  outlines.sort((a, b) => (b === target) - (a === target)); // the target claims its parts first
  for (const o of outlines) {
    if (o !== target && used.has(o)) continue;               // already included as a part of another outline
    const ps = partsOf(o).filter(p => !used.has(p));
    const isTarget = o === target;
    const near = Math.min(...o.ring.map(([x, y]) => Math.hypot(x, y)));
    if (!isTarget && near > radiusM) continue;
    if (ps.length) {
      for (const p of ps) { used.add(p); if (p.tags['building:part'] === 'roof' && !isTarget) continue; prisms.push(toPrism(p, isTarget)); }
      // Parts that only map a podium: the outline's own volume above them is still the building (e.g. a tower on a podium).
      const top = Math.max(...ps.map(p => p.zMax));
      if (!ps.includes(o) && o.zMax > top + 1) prisms.push({ ...toPrism(o, isTarget), zMin: Math.max(o.zMin, top) });
    } else prisms.push(toPrism(o, isTarget));
  }
  for (const p of parts) if (!used.has(p) && Math.min(...p.ring.map(([x, y]) => Math.hypot(x, y))) <= radiusM) prisms.push(toPrism(p, false));

  const tp = prisms.filter(p => p.target);
  const tt = target.tags;
  const footprint = signedArea(target.ring);
  const levels = target.levels ?? Math.max(...tp.map(p => p.levels || Math.round(p.zMax / LEVEL_HEIGHT_M)));
  return {
    id: id || target.osm.replace('/', '-'), name: name || tt.name || tt['name:en'] || tt['addr:street'] && `${tt['addr:street']} ${tt['addr:housenumber'] || ''}`.trim() || target.osm,
    origin: { lat: at.lat, lon: at.lon },
    target: {
      osm: target.osm, use: use || classifyUse(tt), building: tt.building, name: tt.name || null, nameHe: tt['name:he'] || null, nameEn: tt['name:en'] || null,
      address: [tt['addr:street'], tt['addr:housenumber'], tt['addr:city']].filter(Boolean).join(' ') || null,
      heightM: Math.max(...tp.map(p => p.zMax)), heightSource: worstSource(tp), levels: Number.isFinite(levels) ? levels : null,
      footprintM2: Math.round(footprint), hasParts: tp.length > 1 || tp[0]?.osm !== target.osm,
      heritage: tt.heritage || tt['historic'] || null,
    },
    prisms,
  };
}

const toPrism = (r, target) => ({ osm: r.osm, ring: r.ring, zMin: r.zMin, zMax: r.zMax, src: r.src, levels: r.levels, target });
const worstSource = ps => ps.some(p => p.src === 'default') ? 'default' : ps.some(p => p.src === 'levels') ? 'levels' : 'height';

/** Map OSM tags to the building-use classes the model has defaults for. */
export function classifyUse(t = {}) {
  const b = t.building, a = t.amenity, o = t.office, tour = t.tourism;
  if (b === 'hospital' || a === 'hospital' || t.healthcare === 'hospital') return 'hospital';
  if (b === 'hotel' || tour === 'hotel') return 'hotel';
  if (['university', 'college', 'school'].includes(b) || ['university', 'college', 'school'].includes(a)) return 'education';
  if (['apartments', 'residential', 'house', 'dormitory'].includes(b)) return 'residential';
  if (b === 'office' || o || b === 'commercial' || b === 'retail') return 'office';
  return 'office';
}

/** Overpass QL for all buildings and parts within r metres of a point. */
export const overpassQuery = (lat, lon, r = 350) =>
  `[out:json][timeout:60];(way(around:${r},${lat},${lon})[building];relation(around:${r},${lat},${lon})[building];way(around:${r},${lat},${lon})["building:part"];);out geom tags;`;
