// Solar position (NOAA spreadsheet algorithm, ~0.01° for 1800–2100). Azimuth is degrees clockwise from north.
const DEG = Math.PI / 180;

/** t: ms since epoch (UTC). Returns { elevation, azimuth, zenith } in degrees and the sun unit vector (x east, y north, z up). */
export function sunPosition(t, lat, lon) {
  const jd = t / 86400000 + 2440587.5;
  const T = (jd - 2451545) / 36525;
  const L0 = ((280.46646 + T * (36000.76983 + T * 0.0003032)) % 360 + 360) % 360;
  const M = 357.52911 + T * (35999.05029 - 0.0001537 * T);
  const e = 0.016708634 - T * (0.000042037 + 0.0000001267 * T);
  const C = Math.sin(M * DEG) * (1.914602 - T * (0.004817 + 0.000014 * T)) + Math.sin(2 * M * DEG) * (0.019993 - 0.000101 * T) + Math.sin(3 * M * DEG) * 0.000289;
  const omega = 125.04 - 1934.136 * T;
  const lambda = L0 + C - 0.00569 - 0.00478 * Math.sin(omega * DEG);
  const eps0 = 23 + (26 + (21.448 - T * (46.815 + T * (0.00059 - T * 0.001813))) / 60) / 60;
  const eps = eps0 + 0.00256 * Math.cos(omega * DEG);
  const decl = Math.asin(Math.sin(eps * DEG) * Math.sin(lambda * DEG));
  const y = Math.tan((eps * DEG) / 2) ** 2;
  const eot = (4 / DEG) * (y * Math.sin(2 * L0 * DEG) - 2 * e * Math.sin(M * DEG) + 4 * e * y * Math.sin(M * DEG) * Math.cos(2 * L0 * DEG)
    - 0.5 * y * y * Math.sin(4 * L0 * DEG) - 1.25 * e * e * Math.sin(2 * M * DEG));
  const utcMin = (((t % 86400000) + 86400000) % 86400000) / 60000;
  const ha = ((utcMin + eot + 4 * lon) / 4 - 180) * DEG;
  const phi = lat * DEG;
  const cosZ = Math.max(-1, Math.min(1, Math.sin(phi) * Math.sin(decl) + Math.cos(phi) * Math.cos(decl) * Math.cos(ha)));
  const zenith = Math.acos(cosZ) / DEG;
  let azimuth = Math.atan2(Math.sin(ha), Math.cos(ha) * Math.sin(phi) - Math.tan(decl) * Math.cos(phi)) / DEG + 180;
  azimuth = ((azimuth % 360) + 360) % 360;
  const el = (90 - zenith) * DEG, az = azimuth * DEG;
  return { elevation: 90 - zenith, azimuth, zenith, vec: [Math.cos(el) * Math.sin(az), Math.cos(el) * Math.cos(az), Math.sin(el)] };
}

/** Extraterrestrial normal irradiance (W/m²) for day of year. */
export const extraterrestrial = doy => 1361 * (1 + 0.033 * Math.cos((2 * Math.PI * doy) / 365));

/** Unit vector of a surface normal from tilt (0 = horizontal, 90 = vertical) and azimuth (deg from north). */
export function surfaceNormal(tiltDeg, azimuthDeg) {
  const b = tiltDeg * DEG, g = azimuthDeg * DEG;
  return [Math.sin(b) * Math.sin(g), Math.sin(b) * Math.cos(g), Math.cos(b)];
}
