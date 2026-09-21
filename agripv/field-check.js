// A location match is geometric evidence only, never a feasibility conclusion.
export function normalizeSearch(value) {
  return String(value ?? "").normalize("NFKC").toLocaleLowerCase().replace(/[\u0591-\u05c7]/g, "").replace(/[’'"״׳-]/g, " ").replace(/\s+/g, " ").trim();
}

export function parseCoordinates(lat, lon) {
  if (lat == null && lon == null) return null;
  if (lat == null || lon == null || String(lat).trim() === "" || String(lon).trim() === "") throw new Error("invalid_coordinates");
  const point = [Number(lon), Number(lat)];
  if (!point.every(Number.isFinite) || point[0] < -180 || point[0] > 180 || point[1] < -90 || point[1] > 90) throw new Error("invalid_coordinates");
  return point;
}

function ringContains(point, ring) {
  const [x, y] = point;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    const cross = (x - xi) * (yj - yi) - (y - yi) * (xj - xi);
    if (Math.abs(cross) < 1e-12 && x >= Math.min(xi, xj) && x <= Math.max(xi, xj) && y >= Math.min(yi, yj) && y <= Math.max(yi, yj)) return 2;
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside ? 1 : 0;
}

export function containsPoint(geometry, point) {
  if (!geometry || !["Polygon", "MultiPolygon"].includes(geometry.type)) return false;
  const polygons = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  return polygons.some(([outer, ...holes]) => ringContains(point, outer) > 0 && !holes.some(hole => ringContains(point, hole) > 0));
}

export function searchParcels(features, query, district = "") {
  const terms = normalizeSearch(query).split(" ").filter(Boolean);
  return features.filter(({ properties: p }) => {
    if (district && p.district !== district) return false;
    const aliases = { "מרכז": "central center", "נגב": "negev south southern", "צפון מרחב גליל גולן": "north northern galilee golan", "צפון מרחב עמקים": "north northern valleys", "שפלה והר": "shfela lowlands hills", "צפון": "north northern", "דרום": "south southern", "חיפה": "haifa", "ירושלים": "jerusalem" };
    const haystack = normalizeSearch([p.candidateId, p.sourceParcelId, p.sourceFeatureId, p.name, p.locality, p.authority, p.district, aliases[p.district], p.crop, p.cropEnglish].join(" "));
    return terms.every(term => haystack.includes(term));
  });
}

export const FIELD_NEXT_STEPS = [
  { title: "Confirm the field", owner: "Farmer / landholder", detail: "Check the boundary, current crop, cultivated area, irrigation and the season of the observation." },
  { title: "Establish land and planning constraints", owner: "Landholder + qualified planner", detail: "Obtain the relevant land-rights documents and parcel-specific planning review. A nearby plan does not establish permission." },
  { title: "Check agricultural and grid fit", owner: "Agronomist + grid professional", detail: "Review machinery clearance, crop and shading needs, irrigation, and a documented connection pathway before commissioning a detailed design." },
];

export function fieldBriefMarkdown(brief) {
  const notes = brief.notes ?? {};
  const evidence = brief.evidence ?? {};
  return [
    `# ${brief.title || "AgriPV field brief"}`, "", `Saved: ${brief.updatedAt ?? "Not yet saved"}`, `Record: ${brief.candidateId || "User-selected location; no linked parcel"}`,
    brief.lat != null ? `Coordinates (latitude, longitude): ${brief.lat}, ${brief.lon}` : "", "",
    "## Public source record", evidence.name ? `${evidence.name} · ${evidence.locality ?? "Locality not stated"}` : "No agricultural parcel is linked to this brief.",
    `Source observation: ${evidence.sourceUpdatedAt ?? "Unknown"}`, `Source: ${evidence.sourceUrl ?? "Not available"}`, `Evidence snapshot: ${evidence.snapshotId ?? "Not available"}`,
    "Decision: needs farmer confirmation and professional review; no suitability, grid or financial conclusion.", "",
    "## Farmer-provided information — unverified", ...Object.entries(notes).filter(([,value])=>value).map(([key,value])=>`${key}: ${value}`), "",
    "## Questions for the review", ...FIELD_NEXT_STEPS.map((step,index)=>`${index+1}. ${step.title} — ${step.owner}\n${step.detail}`), "",
    "These notes do not change the public project registry or establish land rights, permission, capacity, expected income or crop impact.", "",
  ].filter(line => line !== undefined).join("\n");
}
