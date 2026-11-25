import { prepareClimate } from '../src/climate.js';
import { analyseBuilding, SCENARIOS, VERDICT } from '../src/analyse.js';
import { buildScene, overpassQuery } from '../src/scene.js';
import { QUESTIONS } from '../src/feasibility.js';
import { renderReport } from '../src/report.js';
import { GROUPS } from '../src/irradiance.js';
import { esc, int, dec, ils, mwh, pct, span, years, GROUP_LABEL, SLOT_LABEL } from '../src/format.js';
import { createViewer, irradianceColour, LEGEND_STOPS, TECH_COLOUR } from './render3d.js';

const $ = s => document.querySelector(s);
const S = { model: null, clim: null, pilot: [], filter: 'all', scene: null, result: null, solar: null, inputs: {}, scenario: null, group: null, mode: 'irradiance' };

const viewer = createViewer($('#canvas'), { onPick: P => { if (P?.group) selectGroup(P.group); } });

function status(msg) { const el = $('#status'); el.hidden = !msg; el.textContent = msg || ''; }
const nextFrame = () => new Promise(r => requestAnimationFrame(() => setTimeout(r, 0)));

async function init() {
  status('Loading climate and pilot data…');
  const [model, climRaw, pilot] = await Promise.all([
    fetch('config/model.json').then(r => r.json()),
    fetch('data/climate/tel-aviv.json').then(r => r.json()),
    fetch('out/pilot.json').then(r => (r.ok ? r.json() : null)).catch(() => null)
      .then(p => p || fetch('data/scenes/index.json').then(r => r.json()).then(j => ({ buildings: j.scenes }))),
  ]);
  S.model = model; S.clim = prepareClimate(climRaw); S.pilot = pilot.buildings;
  $('#list-note').textContent = `${S.pilot.length} buildings in Tel Aviv and Ramat Gan${pilot.generatedAt ? ` · screened ${pilot.generatedAt}` : ''}`;
  renderFilters(); renderList(); renderLegend();
  status('');
  const id = decodeURIComponent(location.hash.slice(1));
  if (id && S.pilot.some(b => b.id === id)) openPilot(id);
}

/* ---------- building list ---------- */
const SHORT = { promising: 'promising', marginal: 'marginal', 'not-viable': 'not viable', blocked: 'blocked', 'no-surface': 'no surface' };
const FILTERS = [['all', 'All'], ['promising', 'Promising'], ['marginal', 'Marginal'], ['not-viable', 'Not viable']];
function renderFilters() {
  $('#filters').innerHTML = FILTERS.map(([k, l]) => `<button class="chip${S.filter === k ? ' active' : ''}" data-f="${k}">${l}</button>`).join('');
  $('#filters').onclick = e => { const b = e.target.closest('[data-f]'); if (!b) return; S.filter = b.dataset.f; renderFilters(); renderList(); };
}
function renderList() {
  const fv = b => b.facadeVerdictRenewal || b.verdict;
  const list = S.pilot.filter(b => S.filter === 'all' || fv(b) === S.filter || (S.filter === 'not-viable' && ['not-viable', 'blocked', 'no-surface'].includes(fv(b))));
  $('#buildings').innerHTML = list.map((b, i) => `<li><button data-id="${esc(b.id)}" aria-current="${S.scene?.id === b.id}">
    <span class="rank">${b.rank ?? i + 1}</span><span class="nm">${esc(b.name)}</span><span class="dot v-${fv(b) || 'none'}" title="Facades, with a planned renewal: ${esc(VERDICT[fv(b)] || 'not screened yet')}"></span>
    <span class="sub">${esc(b.city || '')} · ${esc(b.use)} · ${int(b.heightM)} m${b.bestFacadeRenewal ? ` · facade ₪${dec(b.bestFacadeRenewal.lcoe, 2)}/kWh` : ''}</span></button></li>`).join('') || '<li class="minor">No buildings in this group.</li>';
  $('#buildings').onclick = e => { const b = e.target.closest('[data-id]'); if (b) openPilot(b.dataset.id); };
}

async function openPilot(id) {
  status('Loading building…');
  const scene = await fetch(`data/scenes/${encodeURIComponent(id)}.json`).then(r => r.json());
  history.replaceState(null, '', `#${encodeURIComponent(id)}`);
  await openScene(scene);
}

async function openScene(scene) {
  S.scene = scene; S.inputs = {}; S.solar = null; S.group = null; S.scenario = null;
  renderList();
  status(`Simulating 8,760 hours of sun and shade on ${scene.name}…`);
  await nextFrame();
  const t0 = performance.now();
  run();
  S.lastMs = performance.now() - t0;
  viewer.setModel({ prisms: scene.prisms, cells: S.result.solar.cells, colourOf: colourOf });
  status('');
}

function run() {
  S.result = analyseBuilding(S.scene, S.clim, S.model, { ...S.inputs, solar: S.solar || undefined });
  S.solar = S.result.solar;
  if (!S.scenario || !S.result.scenarios.find(s => s.id === S.scenario)?.range) S.scenario = S.result.recommended || 'max-generation';
  renderPanel();
}

/* ---------- colouring ---------- */
function colourOf(c) {
  if (S.mode === 'irradiance') {
    const v = c.group === 'roof' ? c.horiz : c.vert;
    const col = irradianceColour(v);
    return c.excluded ? col.map(x => x * 0.45) : col;
  }
  if (c.excluded || !c.suitable) return null;
  const sc = S.result.scenarios.find(s => s.id === S.scenario);
  if (!sc) return null;
  const ids = new Set(sc.options);
  const pick = slot => { const o = S.result.options.find(o => ids.has(o.id) && o.group === c.group && o.slot === slot); return o && TECH_COLOUR[o.techId]; };
  if (c.group === 'roof') return pick('roof');
  const a = pick('opaque'), w = pick('window');
  if (a && w) { const h = c.quad[2][2] - c.quad[0][2]; return Math.round(c.z / h) % 2 ? w : a; } // stripes: louvre rows and cladding rows
  return a || w || null;
}

function renderLegend() {
  const el = $('#legend');
  if (S.mode === 'irradiance') {
    const g = LEGEND_STOPS.map(([v, c]) => `rgb(${c}) ${((v - 250) / 1900) * 100}%`).join(',');
    el.innerHTML = `Annual irradiation, kWh/m²<div class="bar" style="background:linear-gradient(90deg,${g})"></div><div class="ticks"><span>250</span><span>1,000</span><span>1,500</span><span>2,150</span></div>Dimmed: lowest ${S.model?.screening.excludeBelowM ?? 7} m, left out`;
  } else {
    el.innerHTML = Object.entries(TECH_COLOUR).map(([k, c]) => `<span class="sw"><i style="background:rgb(${c})"></i>${esc(S.model.technologies[k].short)}</span>`).join('') + '<span class="sw"><i style="background:#505a64"></i>Not used</span>';
  }
}

$('#modes').onclick = e => {
  const b = e.target.closest('[data-mode]'); if (!b) return;
  S.mode = b.dataset.mode;
  for (const x of $('#modes').children) x.classList.toggle('active', x === b);
  renderLegend(); if (S.result) viewer.recolour(colourOf);
};
$('#views').onclick = e => { const b = e.target.closest('[data-yaw]'); if (b) viewer.view(Number(b.dataset.yaw)); };

function selectGroup(g) { S.group = S.group === g ? null : g; viewer.select(S.group); renderPanel(); document.getElementById('surface-card')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }

/* ---------- panel ---------- */
function renderPanel() {
  const r = S.result, t = r.scene.target, M = S.model;
  const sc = r.scenarios.find(s => s.id === S.scenario), R = sc?.range;
  const optById = Object.fromEntries(r.options.map(o => [o.id, o]));
  const blockers = [...new Set(r.options.flatMap(o => o.blockers.map(b => b.text)))];

  const kpis = R ? `<div class="kpis">
      ${kpi('System', `${int(R[1].kwp)} kWp`, `${int(R[1].areaM2)} m² of modules`)}
      ${kpi('Generation', `${mwh(R[1].genKwhYr)}/yr`, span(R, 'genKwhYr', mwh))}
      ${kpi('Investment', ils(R[1].capex), span(R, 'capex', ils))}
      ${kpi('Payback', years(R[1].payback), span(R, 'payback'))}
      ${kpi('NPV, 25 yr', ils(R[1].npv), span(R, 'npv', ils))}
      ${kpi('Cost of energy', `₪${dec(R[1].lcoe, 2)}/kWh`, `worth ₪${dec(R[1].valuePerKwh, 2)}/kWh here`)}
      ${kpi('Used on site', pct(R[1].selfShare), `${esc(r.inputs.meter)} meter`)}
      ${kpi('Added weight', `${int(sc.weightKg / 1000)} t`, `${sc.options.length} surface option${sc.options.length === 1 ? '' : 's'}`)}
    </div><p class="minor" style="margin-top:8px">${sc.options.map(id => esc(`${GROUP_LABEL[optById[id].group]}: ${optById[id].tech.label}`)).join(' · ')}</p>`
    : '<p class="minor">No option qualifies for this scenario.</p>';

  const surf = GROUPS.filter(g => r.solar.groups[g].cells).map(g => {
    const G = r.solar.groups[g];
    return `<tr class="click${S.group === g ? ' sel' : ''}" data-g="${g}"><td>${GROUP_LABEL[g]}</td><td class="num">${int(G.meanAnnual)}</td><td class="num">${int(G.suitableArea)} m²</td><td class="num">${pct(G.suitableShare)}</td></tr>`;
  }).join('');

  const groupOpts = S.group ? r.options.filter(o => o.group === S.group) : [];
  const surfaceCard = S.group ? `<div class="card" id="surface-card"><h3>${GROUP_LABEL[S.group]} <small>technologies compared</small></h3>
    ${groupOpts.length ? `<table><thead><tr><th>Option</th><th class="num">kWp</th><th class="num">MWh/yr</th><th class="num">Payback</th><th class="num">NPV</th><th class="num">₪/kWh</th></tr></thead><tbody>
    ${groupOpts.map(o => { const c = o.range[1]; return `<tr class="${o.blockers.length ? 'blk' : ''}"><td>${esc(o.tech.label)}<br><span class="minor">${SLOT_LABEL[o.slot]} · ${int(o.areaM2)} m² · ${int(o.specificYield)} kWh/kWp · ${o.tech.weightKgM2} kg/m²</span>${o.blockers.length ? `<div class="blk-note">Blocked: ${esc(o.blockers.map(b => b.text).join('; '))}</div>` : ''}</td>
      <td class="num">${int(o.kwp)}</td><td class="num">${dec(o.annualKwh / 1000, 0)}</td><td class="num">${c.payback == null ? '>25' : dec(c.payback, 1)}</td><td class="num">${ils(c.npv)}</td><td class="num">${dec(c.lcoe, 2)}</td></tr>`; }).join('')}</tbody></table>`
    : '<p class="minor">No part of this surface passes the irradiance threshold.</p>'}
    <p class="minor">Central case. Mean irradiation on the suitable part: ${int(r.solar.groups[S.group].primary.annual)} kWh/m²·yr (${r.solar.groups[S.group].primary.plane}).</p></div>` : '';

  const F = r.feasibility;
  const answers = r.inputs.answers;
  const useOpts = Object.entries(M.buildingUse).map(([k, u]) => `<option value="${k}"${k === r.inputs.use ? ' selected' : ''}>${esc(u.label)}</option>`).join('');

  $('#panel').innerHTML = `
    <div class="b-head"><div class="eyebrow">${esc([r.scene.city, r.inputs.useLabel].filter(Boolean).join(' · '))}</div>
      <h1>${esc(r.scene.name)}</h1>
      <div class="minor">${int(t.heightM)} m${t.levels ? ` · ${t.levels} storeys` : ''} · height from ${t.heightSource === 'height' ? 'mapped height' : t.heightSource === 'levels' ? 'storey count' : 'a default'} · <a href="https://www.openstreetmap.org/${esc(t.osm)}" target="_blank" rel="noopener">OSM ${esc(t.osm)}</a></div>
      <div class="pills"><span class="pill ${r.facadeVerdict}" title="${esc(VERDICT[r.facadeVerdict])}">Facades: ${esc(SHORT[r.facadeVerdict])}</span><span class="pill ${r.verdict}" title="${esc(VERDICT[r.verdict])}">Whole building: ${esc(SHORT[r.verdict])}</span><span class="pill">Feasibility ${F.score}/100</span></div>
      <p class="minor">${esc(VERDICT[r.facadeVerdict])} for facades${r.facadeBest ? ` (best: ${esc(GROUP_LABEL[optById[r.facadeBest].group])}, ${esc(optById[r.facadeBest].tech.label)}, ₪${dec(optById[r.facadeBest].range[1].lcoe, 2)}/kWh)` : ''}.</p>
    </div>
    ${blockers.length ? `<div class="alert"><b>Critical issues</b> (options excluded, not scored down): ${blockers.map(esc).join('; ')}</div>` : ''}

    <div class="card"><h3>Scenario <small>${esc(sc?.hint || '')}</small></h3>
      <div class="scen" id="scen">${r.scenarios.map(s => `<button data-s="${s.id}" class="${s.id === S.scenario ? 'active' : ''}"${s.range ? '' : ' disabled'}>${esc(s.label)}${s.id === r.recommended ? ' ★' : ''}</button>`).join('')}</div>
      ${kpis}
      <p class="minor">Ranges: optimistic to conservative case. ★ recommended (highest central NPV).</p>
    </div>

    <div class="card"><h3>Surfaces <small>click a row or the model</small></h3>
      <table id="surf"><thead><tr><th>Surface</th><th class="num">kWh/m²·yr</th><th class="num">Suitable</th><th class="num">Share</th></tr></thead><tbody>${surf}</tbody></table>
    </div>
    ${surfaceCard}

    <div class="card"><h3>Retrofit Feasibility Score <small>${F.score}/100 · ${F.grade}</small></h3>
      <div class="bars">${F.categories.map(c => `<div class="barrow"><span>${esc(c.label)}</span><span class="track"><i style="width:${c.score}%"></i></span><b>${c.score}</b></div>`).join('')}</div>
      <details><summary>Survey answers (${QUESTIONS.filter(q => answers[q.id] !== 'unknown').length} of ${QUESTIONS.length} known)</summary>
        <div id="qs">${QUESTIONS.map(q => `<label class="q"><span>${esc(q.label)}</span><select data-q="${q.id}">${Object.keys(q.options).map(v => `<option${v === answers[q.id] ? ' selected' : ''}>${v}</option>`).join('')}</select></label>`).join('')}</div>
      </details>
      <details><summary>Required checks (${F.checks.length})</summary><ol>${F.checks.map(c => `<li>${esc(c)}</li>`).join('')}</ol></details>
    </div>

    <div class="card"><h3>Building inputs</h3>
      <label class="inp"><span>Use</span><select id="in-use">${useOpts}</select></label>
      <label class="inp"><span>Facade renewal planned</span><select id="in-renew"><option value="no"${r.inputs.facadeRenewal === 'no' ? ' selected' : ''}>No</option><option value="planned"${r.inputs.facadeRenewal === 'planned' ? ' selected' : ''}>Yes: credit avoided cladding</option></select></label>
      <label class="inp"><span>Window-to-wall ratio</span><input id="in-wwr" type="number" min="0" max="0.95" step="0.05" value="${r.inputs.wwr}"></label>
      <label class="inp"><span>Consumption, kWh/yr (${esc(r.inputs.meter)})</span><input id="in-load" type="number" min="0" step="10000" value="${r.inputs.annualLoadKwh}"></label>
      <p class="minor">Floor area ≈ ${int(r.inputs.floorAreaM2)} m² from the 3D model. Prices and tariffs: <code>config/model.json</code>.</p>
    </div>

    <div class="actions"><button class="btn" id="export">Download feasibility report</button></div>
    <p class="minor" style="margin-top:10px">Climate: ${esc(r.climate.radiationDb)} ${esc(r.climate.years)} typical year · simulated in ${int(S.lastMs || 0)} ms.</p>`;

  $('#scen').onclick = e => { const b = e.target.closest('[data-s]'); if (!b || b.disabled) return; S.scenario = b.dataset.s; renderPanel(); if (S.mode !== 'scenario') $('#modes [data-mode=scenario]').click(); else viewer.recolour(colourOf); };
  $('#surf').onclick = e => { const row = e.target.closest('[data-g]'); if (row) selectGroup(row.dataset.g); };
  $('#qs').onchange = e => { const s = e.target.closest('[data-q]'); if (!s) return; S.inputs.answers = { ...r.inputs.answers, [s.dataset.q]: s.value }; rerun(); };
  $('#in-use').onchange = e => { S.inputs.use = e.target.value; delete S.inputs.wwr; delete S.inputs.annualLoadKwh; rerun(); };
  $('#in-renew').onchange = e => { S.inputs.facadeRenewal = e.target.value; rerun(); };
  $('#in-wwr').onchange = e => { S.inputs.wwr = clampNum(e.target.value, 0, 0.95); rerun(); };
  $('#in-load').onchange = e => { S.inputs.annualLoadKwh = clampNum(e.target.value, 0, 1e9); rerun(); };
  $('#export').onclick = exportReport;
  viewer.recolour(colourOf);
}

function rerun() {
  const open = [...document.querySelectorAll('#panel details')].map(d => d.open);
  run();
  document.querySelectorAll('#panel details').forEach((d, i) => { d.open = open[i]; });
}
const clampNum = (v, a, b) => Math.max(a, Math.min(b, Number(v) || 0));
const kpi = (label, big, small) => `<div class="kpi"><span>${label}</span><b>${big}</b><small>${small}</small></div>`;

function exportReport() {
  const wasMode = S.mode;
  const html = renderReport(S.result, S.model, { image: viewer.snapshot() });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
  a.download = `vpv-${S.result.scene.id}.html`;
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  S.mode = wasMode;
}

/* ---------- address search (live OSM) ---------- */
$('#search').onsubmit = async e => {
  e.preventDefault();
  const q = $('#q').value.trim(); if (!q) return;
  try {
    let lat, lon, label = q;
    const m = /^\s*(-?\d+(?:\.\d+)?)\s*[, ]\s*(-?\d+(?:\.\d+)?)\s*$/.exec(q);
    if (m) { lat = +m[1]; lon = +m[2]; }
    else {
      status(`Finding “${q}”…`);
      const g = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&countrycodes=il&limit=1&q=${encodeURIComponent(q)}`).then(r => r.json());
      if (!g.length) throw new Error('Address not found in OpenStreetMap');
      lat = +g[0].lat; lon = +g[0].lon; label = g[0].display_name.split(',').slice(0, 2).join(',');
    }
    status('Loading buildings around it from OpenStreetMap…');
    const osm = await fetch('https://overpass-api.de/api/interpreter', { method: 'POST', body: new URLSearchParams({ data: overpassQuery(lat, lon, 550) }) }).then(r => { if (!r.ok) throw new Error(`Overpass ${r.status}, try again in a minute`); return r.json(); });
    const scene = buildScene(osm, { lat, lon }, { radiusM: 400 });
    scene.id = `live-${scene.target.osm.replace('/', '-')}`;
    if (!scene.target.name) scene.name = label;
    scene.source = { text: '© OpenStreetMap contributors, ODbL 1.0', fetchedAt: new Date().toISOString().slice(0, 10) };
    history.replaceState(null, '', location.pathname);
    await openScene(scene);
  } catch (err) { status(''); alert(err.message); }
};

init().catch(err => status(`Could not load data: ${err.message}`));
