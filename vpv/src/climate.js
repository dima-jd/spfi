// Typical meteorological year (PVGIS TMY, 8760 hourly values, UTC) prepared for the irradiance model.
import { sunPosition, extraterrestrial } from './sun.js';

export const REF_YEAR = 2023; // non-leap reference year used for timestamps and weekdays
export const HOUR_MS = 3600000;
const T0 = Date.UTC(REF_YEAR, 0, 1);

/** Compact a PVGIS /tmy JSON response into the stored climate file. */
export function compactPvgisTmy(j, retrievedAt) {
  const h = j?.outputs?.tmy_hourly;
  if (!Array.isArray(h) || h.length !== 8760) throw new Error('PVGIS TMY response without 8760 hourly rows');
  const loc = j.inputs.location, met = j.inputs.meteo_data;
  return {
    sourceId: 'source-jrc-pvgis-tmy',
    source: 'PVGIS 5.3 typical meteorological year, European Commission Joint Research Centre',
    radiationDb: met.radiation_db, meteoDb: met.meteo_db, years: `${met.year_min}–${met.year_max}`,
    lat: loc.latitude, lon: loc.longitude, elevation: loc.elevation,
    irradianceTimeOffsetH: loc.irradiance_time_offset ?? 0,
    retrievedAt,
    monthsSelected: j.outputs.months_selected,
    ghi: h.map(r => Math.round(r['G(h)'])), dni: h.map(r => Math.round(r['Gb(n)'])), dhi: h.map(r => Math.round(r['Gd(h)'])),
    t2m: h.map(r => Math.round(r.T2m * 10) / 10), ws: h.map(r => Math.round(r.WS10m * 10) / 10),
  };
}

/** Hour index → timestamp in the reference year (start of the UTC hour). */
export const hourTime = i => T0 + i * HOUR_MS;

/** Israel local time offset (h) for a UTC timestamp: IST +2, IDT +3 (Friday before last Sunday of March → last Sunday of October). */
export function israelOffsetH(t) {
  const y = new Date(t).getUTCFullYear();
  const lastSun = m => { const d = new Date(Date.UTC(y, m + 1, 0)); return d.getUTCDate() - d.getUTCDay(); };
  const start = Date.UTC(y, 2, lastSun(2) - 2, 0); // Friday 02:00 local = 00:00 UTC
  const end = Date.UTC(y, 9, lastSun(9), 0);       // Sunday 02:00 local (IDT) = 23:00 UTC Saturday; close enough at 1 h resolution
  return t >= start && t < end ? 3 : 2;
}

/**
 * Prepared climate: sun geometry for daylight hours plus all-hour temperature and wind.
 * Hay–Davies anisotropy index Ai = DNI / E0n.
 */
export function prepareClimate(c, lat = c.lat, lon = c.lon) {
  const off = (c.irradianceTimeOffsetH || 0) * HOUR_MS;
  const day = [];
  for (let i = 0; i < 8760; i++) {
    if (c.ghi[i] <= 0 && c.dhi[i] <= 0) continue;
    const s = sunPosition(hourTime(i) + off, lat, lon);
    if (s.elevation <= 0.5) continue;
    const doy = Math.floor(i / 24) + 1, e0 = extraterrestrial(doy);
    const dni = c.dni[i], dhi = c.dhi[i];
    day.push({ i, sx: s.vec[0], sy: s.vec[1], sz: s.vec[2], el: s.elevation, az: s.azimuth, dni, dhi, ghi: c.ghi[i], ai: Math.min(1, dni / e0) });
  }
  const local = new Int16Array(8760), weekday = new Int8Array(8760), month = new Int8Array(8760);
  for (let i = 0; i < 8760; i++) {
    const t = hourTime(i), d = new Date(t + israelOffsetH(t) * HOUR_MS);
    local[i] = d.getUTCHours(); weekday[i] = d.getUTCDay(); month[i] = new Date(t).getUTCMonth();
  }
  return { meta: { source: c.source, sourceId: c.sourceId, radiationDb: c.radiationDb, years: c.years, lat: c.lat, lon: c.lon, retrievedAt: c.retrievedAt }, day, t2m: c.t2m, ws: c.ws, ghi: c.ghi, localHour: local, weekday, month };
}
