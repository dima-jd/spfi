// Self-contained, printable feasibility report (HTML) for one analysed building.
import { esc, int, dec, ils, mwh, pct, span, years, GROUP_LABEL, SLOT_LABEL } from './format.js';
import { VERDICT } from './analyse.js';
import { GROUPS } from './irradiance.js';
import { QUESTIONS } from './feasibility.js';

export function renderReport(r, model, { image, date = new Date().toISOString().slice(0, 10) } = {}) {
  const t = r.scene.target, rec = r.scenarios.find(s => s.id === r.recommended), R = rec?.range;
  const optById = Object.fromEntries(r.options.map(o => [o.id, o]));
  const econ = model.economics;
  const blocked = r.options.filter(o => o.blockers.length);
  const blockerTexts = [...new Set(blocked.flatMap(o => o.blockers.map(b => b.text)))];
  const qLabel = Object.fromEntries(QUESTIONS.map(q => [q.id, q.label]));

  const surfaceRows = GROUPS.map(g => {
    const G = r.solar.groups[g];
    if (!G.cells) return '';
    return `<tr><td>${GROUP_LABEL[g]}</td><td>${int(G.grossArea)} m²</td><td>${int(G.meanAnnual)}</td><td>${int(G.suitableArea)} m²</td><td>${pct(G.suitableShare)}</td></tr>`;
  }).join('');

  const optionRows = r.options.map(o => {
    const c = o.range[1];
    return `<tr class="${o.blockers.length ? 'blocked' : ''}"><td>${GROUP_LABEL[o.group]}<br><small>${SLOT_LABEL[o.slot]}</small></td><td>${esc(o.tech.label)}</td><td>${int(o.areaM2)} m²</td><td>${int(o.kwp)}</td><td>${mwh(o.annualKwh)}</td><td>${int(o.specificYield)}</td>
      <td>${ils(c.capex)}</td><td>${span(o.range, 'payback')}</td><td>${ils(c.npv)}</td><td>${dec(c.lcoe, 2)}</td><td>${o.blockers.length ? '<b>Blocked</b>: ' + esc(o.blockers.map(b => b.text).join('; ')) : ''}</td></tr>`;
  }).join('');

  const scenarioRows = r.scenarios.map(s => {
    if (!s.range) return `<tr><td>${esc(s.label)}</td><td colspan="7">No option qualifies</td></tr>`;
    const c = s.range[1];
    return `<tr${s.id === r.recommended ? ' class="rec"' : ''}><td>${esc(s.label)}${s.id === r.recommended ? ' ★' : ''}<br><small>${esc(s.hint)}</small></td><td>${s.options.map(id => esc(`${GROUP_LABEL[optById[id].group]}: ${optById[id].tech.short}`)).join('<br>')}</td>
      <td>${int(c.kwp)}</td><td>${span(s.range, 'genKwhYr', mwh)}</td><td>${span(s.range, 'capex', ils)}</td><td>${span(s.range, 'payback')}</td><td>${span(s.range, 'npv', ils)}</td><td>${int(s.weightKg / 1000)} t</td></tr>`;
  }).join('');

  const cats = r.feasibility.categories.map(c => `<tr><td>${esc(c.label)}</td><td><b>${c.score}</b></td><td>${c.items.map(i => `${esc(i.label)}: ${esc(i.value)}`).join('<br>')}</td></tr>`).join('');

  const head = R ? `
    <div class="kpis">
      <div><span>Recommended</span><b>${esc(rec.label)}</b><small>${rec.options.map(id => esc(`${GROUP_LABEL[optById[id].group]} ${optById[id].tech.short}`)).join(', ')}</small></div>
      <div><span>System size</span><b>${int(R[1].kwp)} kWp</b><small>${int(R[1].areaM2)} m² of modules</small></div>
      <div><span>Generation</span><b>${mwh(R[1].genKwhYr)}/yr</b><small>range ${span(R, 'genKwhYr', mwh)}</small></div>
      <div><span>Investment</span><b>${ils(R[1].capex)}</b><small>range ${span(R, 'capex', ils)}</small></div>
      <div><span>Payback</span><b>${years(R[1].payback)}</b><small>range ${span(R, 'payback')}</small></div>
      <div><span>NPV (${econ.lifetimeYr} yr)</span><b>${ils(R[1].npv)}</b><small>range ${span(R, 'npv', ils)}</small></div>
      <div><span>Cost of energy</span><b>₪${dec(R[1].lcoe, 2)}/kWh</b><small>value ₪${dec(R[1].valuePerKwh, 2)}/kWh</small></div>
      <div><span>Used in the building</span><b>${pct(R[1].selfShare)}</b><small>${esc(r.inputs.meter)} meter</small></div>
    </div>` : '<p>No option pays back under the current assumptions and checks.</p>';

  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>VPV assessment – ${esc(r.scene.name)}</title>
<style>
:root{--ink:#152029;--muted:#59656e;--line:#dce1df;--paper:#fff;--blue:#153eeb;--yellow:#ffe050;--red:#b42318;--green:#17664d}
body{margin:0;font:14px/1.5 system-ui,-apple-system,'Segoe UI',sans-serif;color:var(--ink);background:var(--paper)}
main{max-width:1000px;margin:auto;padding:32px 24px}
h1{font-size:30px;margin:6px 0 4px;letter-spacing:-.02em}h2{font-size:19px;margin:34px 0 10px;border-bottom:2px solid var(--ink);padding-bottom:4px}
.eyebrow{color:var(--blue);font-size:11px;letter-spacing:.14em;text-transform:uppercase;font-weight:700}
.meta{color:var(--muted)}.verdict{display:inline-block;padding:4px 10px;border-radius:3px;font-weight:700;margin-top:10px}
.v-promising{background:#d9f2e6;color:var(--green)}.v-marginal{background:#fff4c2;color:#6b5300}.v-not-viable,.v-blocked,.v-no-surface{background:#fde4e1;color:var(--red)}
.kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:18px}.kpis div{border:1px solid var(--line);padding:10px 12px;border-radius:4px}
.kpis span{display:block;font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.06em}.kpis b{display:block;font-size:19px}.kpis small{color:var(--muted)}
table{border-collapse:collapse;width:100%;font-size:12.5px}th,td{border-bottom:1px solid var(--line);padding:6px 6px;text-align:left;vertical-align:top}th{font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.04em}
tr.blocked td{color:#8a9196}tr.blocked td:last-child{color:var(--red)}tr.rec{background:#f4f6ff}small{color:var(--muted)}
.img{width:100%;border:1px solid var(--line);border-radius:4px;margin-top:18px}.blockers{border-left:4px solid var(--red);padding:6px 14px;background:#fff6f5}
ol li{margin:4px 0}.note{font-size:12px;color:var(--muted)}
@media(max-width:700px){.kpis{grid-template-columns:1fr 1fr}main{padding:20px 16px}table{font-size:11.5px}}
@media print{main{padding:0}h2{break-after:avoid}tr{break-inside:avoid}}
</style></head><body><main>
<div class="eyebrow">SPFI research · VPV Vertical Solar · Building solar screening</div>
<h1>${esc(r.scene.name)}</h1>
<div class="meta">${esc([r.scene.nameHe, r.scene.city].filter(Boolean).join(' · '))} · ${esc(r.inputs.useLabel)} · ${int(t.heightM)} m${t.levels ? `, ${t.levels} storeys` : ''} · OSM <a href="https://www.openstreetmap.org/${esc(t.osm)}">${esc(t.osm)}</a> · report ${esc(date)}</div>
<div class="verdict v-${r.facadeVerdict}">Facades: ${esc(VERDICT[r.facadeVerdict])}</div>
<div class="verdict v-${r.verdict}" style="margin-left:6px">Whole building: ${esc(VERDICT[r.verdict])}</div>
<div class="verdict" style="background:#eef1f3;margin-left:6px">Retrofit Feasibility Score ${r.feasibility.score}/100 (${r.feasibility.grade})</div>
${head}
${image ? `<img class="img" src="${image}" alt="3D model of the building coloured by annual solar irradiation on each surface">` : ''}

<h2>1. Solar exposure of each surface</h2>
<p class="note">Annual irradiation in kWh/m² from an hourly simulation of a typical year, with shading from neighbouring buildings. The lowest ${model.screening.excludeBelowM} m are left out (entrances, shop fronts, deep street shade). Suitable: at least ${model.screening.facadeMinKwhM2} kWh/m² on facades, ${model.screening.roofMinKwhM2} on roofs.</p>
<table><thead><tr><th>Surface</th><th>Area</th><th>Mean kWh/m²·yr</th><th>Suitable area</th><th>Share</th></tr></thead><tbody>${surfaceRows}</tbody></table>

<h2>2. Technology options</h2>
<p class="note">Window-to-wall ratio ${pct(r.inputs.wwr)}. Facade renewal planned: ${r.inputs.facadeRenewal === 'planned' ? 'yes, avoided cladding and shading costs are credited' : 'no'}. Figures are for the central case; payback shows the optimistic to conservative range. LCOE in ₪/kWh.</p>
<table><thead><tr><th>Surface</th><th>Technology</th><th>Modules</th><th>kWp</th><th>Generation</th><th>kWh/kWp</th><th>CAPEX</th><th>Payback</th><th>NPV</th><th>LCOE</th><th>Issues</th></tr></thead><tbody>${optionRows}</tbody></table>

<h2>3. Scenarios</h2>
<table><thead><tr><th>Scenario</th><th>Options</th><th>kWp</th><th>Generation</th><th>CAPEX</th><th>Payback</th><th>NPV</th><th>Added weight</th></tr></thead><tbody>${scenarioRows}</tbody></table>

<h2>4. Retrofit Feasibility Score: ${r.feasibility.score}/100</h2>
${blockerTexts.length ? `<div class="blockers"><b>Critical issues: these options are excluded, not just scored down</b><ul>${blockerTexts.map(b => `<li>${esc(b)}</li>`).join('')}</ul></div>` : ''}
<table><thead><tr><th>Category</th><th>Score</th><th>Basis</th></tr></thead><tbody>${cats}</tbody></table>

<h2>5. Required checks before design</h2>
<ol>${r.feasibility.checks.map(c => `<li>${esc(c)}</li>`).join('')}</ol>

<h2>6. Assumptions</h2>
<table><tbody>
<tr><td>Electricity consumption</td><td>${int(r.inputs.annualLoadKwh)} kWh/yr (${esc(r.inputs.useLabel)} profile, ${int(r.inputs.floorAreaM2)} m² floor area estimated from the 3D model)</td></tr>
<tr><td>Value of electricity used on site</td><td>₪${econ.selfConsumedIlsPerKwh.join(' / ')} per kWh (conservative / central / optimistic)</td></tr>
<tr><td>Value of exported electricity</td><td>₪${econ.exportIlsPerKwh.join(' / ')} per kWh</td></tr>
<tr><td>Discount rate (real)</td><td>${econ.discountRate.map(x => pct(x, 1)).join(' / ')}</td></tr>
<tr><td>Lifetime</td><td>${econ.lifetimeYr} years; inverters replaced in year ${econ.inverterReplacementYr}</td></tr>
<tr><td>Model uncertainty on generation</td><td>roof ${econ.generationFactor.roof.join(' / ')}, facades ${econ.generationFactor.facade.join(' / ')}</td></tr>
${Object.values(model.technologies).map(x => `<tr><td>${esc(x.label)}</td><td>module efficiency ${pct(x.moduleEff, 1)}, CAPEX ₪${x.capexIlsPerKwp.map(int).join('–')}/kWp, O&amp;M ₪${x.opexIlsPerM2Yr.join('–')}/m²·yr, ${x.weightKgM2} kg/m²${x.combustible ? ', combustible substrate' : ''}</td></tr>`).join('')}
<tr><td>Survey answers</td><td>${Object.entries(r.inputs.answers).map(([k, v]) => `${esc(qLabel[k] || k)}: ${esc(v)}`).join('<br>')}</td></tr>
</tbody></table>
<p class="note">All prices are screening assumptions in ILS, not quotes. A detailed study would replace them with real prices and the building's actual tariff.</p>

<h2>7. Data sources and method</h2>
<ul>
<li>Building geometry: ${esc(r.scene.source?.text || '© OpenStreetMap contributors, ODbL 1.0')}${r.scene.source?.fetchedAt ? `, retrieved ${esc(r.scene.source.fetchedAt)}` : ''}. Heights come from the mapped height tag or storey count (target height source: ${esc(t.heightSource)}). Buildings without either get a default by type.</li>
<li>Climate: ${esc(r.climate.source)}, ${esc(r.climate.radiationDb)} radiation, ${esc(r.climate.years)}, at ${dec(r.climate.lat, 3)}°N ${dec(r.climate.lon, 3)}°E${r.climate.retrievedAt ? `, retrieved ${esc(r.climate.retrievedAt)}` : ''}.</li>
<li>Method: sun position for 8,760 hours; per-cell horizon from ray casts against neighbouring buildings (5° bins); Hay–Davies transposition with obstructed sky view factor; Faiman cell temperature; fixed loss chain; hourly match against a modelled consumption profile; 25-year discounted cash flow in three cases.</li>
<li>Not modelled yet: balcony railings, reflections from glass facades, cooling effect of opaque BIPV, detailed string layout, export limits.</li>
</ul>
<p class="note">Preliminary research screening from SPFI, showing where a detailed study could make sense. It is not an engineering design, a structural or fire assessment, a feasibility approval or an offer.</p>
</main></body></html>`;
}
