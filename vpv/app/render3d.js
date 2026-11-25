// Dependency-free 3D viewer on a 2D canvas: perspective orbit camera, painter's algorithm, picking.
// Neighbour buildings are drawn as grey prisms; the target building as coloured analysis cells.

const STOPS = [[250, [38, 24, 82]], [600, [96, 38, 140]], [900, [178, 52, 112]], [1200, [232, 96, 62]], [1550, [249, 166, 50]], [1900, [252, 226, 110]], [2150, [255, 248, 200]]];
export function irradianceColour(v) {
  if (v <= STOPS[0][0]) return STOPS[0][1];
  for (let i = 1; i < STOPS.length; i++) {
    const [v1, c1] = STOPS[i];
    if (v <= v1) { const [v0, c0] = STOPS[i - 1], t = (v - v0) / (v1 - v0); return c0.map((c, k) => Math.round(c + (c1[k] - c) * t)); }
  }
  return STOPS[STOPS.length - 1][1];
}
export const LEGEND_STOPS = STOPS;
export const TECH_COLOUR = { bipv: [33, 76, 230], flexible: [133, 86, 214], louvres: [255, 205, 40], bapv: [22, 178, 140] };

const rgb = (c, k = 1, a = 1) => `rgba(${Math.round(c[0] * k)},${Math.round(c[1] * k)},${Math.round(c[2] * k)},${a})`;

export function createViewer(canvas, { onPick } = {}) {
  const ctx = canvas.getContext('2d');
  const cam = { yaw: -35, pitch: 28, dist: 300, cx: 0, cy: 0, cz: 40 };
  let polys = [], dpr = 1, W = 0, H = 0, selectedGroup = null, hover = null, frameReq = 0, drawn = [];
  const light = norm([-0.4, -0.6, 0.8]);
  const cssVar = n => getComputedStyle(canvas).getPropertyValue(n).trim();

  function resize() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    const r = canvas.getBoundingClientRect(); W = r.width; H = r.height;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    draw();
  }
  new ResizeObserver(resize).observe(canvas);

  function basis() {
    const y = cam.yaw * Math.PI / 180, p = cam.pitch * Math.PI / 180;
    const eye = [cam.cx + cam.dist * Math.cos(p) * Math.sin(y), cam.cy - cam.dist * Math.cos(p) * Math.cos(y), cam.cz + cam.dist * Math.sin(p)];
    const f = norm([cam.cx - eye[0], cam.cy - eye[1], cam.cz - eye[2]]);
    const r = norm(cross(f, [0, 0, 1])), u = cross(r, f);
    return { eye, f, r, u, focal: Math.min(W, H) * 1.25 };
  }

  function draw() { cancelAnimationFrame(frameReq); frameReq = requestAnimationFrame(render); }

  function render() {
    if (!W) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = cssVar('--viewer-bg') || '#0f1b26'; ctx.fillRect(0, 0, W, H);
    const B = basis();
    const out = [];
    for (const P of polys) {
      if (P.n && P.wall) { // back-face cull walls
        const c = P.c; if ((c[0] - B.eye[0]) * P.n[0] + (c[1] - B.eye[1]) * P.n[1] + (c[2] - B.eye[2]) * P.n[2] > 0) continue;
      }
      const pts = []; let zs = 0, ok = true;
      for (const v of P.v) {
        const d = [v[0] - B.eye[0], v[1] - B.eye[1], v[2] - B.eye[2]];
        const z = dot(d, B.f); if (z < 1) { ok = false; break; }
        pts.push([W / 2 + B.focal * dot(d, B.r) / z, H / 2 - B.focal * dot(d, B.u) / z]); zs += z;
      }
      if (!ok) continue;
      const cd = [P.c[0] - B.eye[0], P.c[1] - B.eye[1], P.c[2] - B.eye[2]];
      out.push({ P, pts, depth: dot(cd, B.f) + (P.bias || 0) });
    }
    out.sort((a, b) => b.depth - a.depth);
    // ground grid
    for (const { P, pts } of out) {
      ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
      ctx.closePath();
      const hl = selectedGroup && P.group === selectedGroup;
      ctx.fillStyle = P.fill(hl); ctx.fill();
      if (P.stroke) { ctx.strokeStyle = P.stroke(hl); ctx.lineWidth = 0.6; ctx.stroke(); }
    }
    drawn = out;
    // north arrow
    const B2 = basis(), a = Math.atan2(dot([0, 1, 0], B2.r), dot([0, 1, 0], B2.u));
    ctx.save(); ctx.translate(W - 34, 34); ctx.rotate(a);
    ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.beginPath(); ctx.moveTo(0, -14); ctx.lineTo(6, 6); ctx.lineTo(0, 2); ctx.lineTo(-6, 6); ctx.closePath(); ctx.fill();
    ctx.restore(); ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.font = '600 11px system-ui'; ctx.textAlign = 'center'; ctx.fillText('N', W - 34, 62);
  }

  function pick(x, y) {
    for (let i = drawn.length - 1; i >= 0; i--) {
      const d = drawn[i];
      if (d.P.pickable && inPoly(x, y, d.pts)) return d.P;
    }
    return null;
  }

  // interaction: drag = orbit, shift/right drag = pan, wheel/pinch = zoom
  let drag = null; const pointers = new Map();
  canvas.addEventListener('contextmenu', e => e.preventDefault());
  canvas.addEventListener('pointerdown', e => {
    canvas.setPointerCapture(e.pointerId); pointers.set(e.pointerId, [e.offsetX, e.offsetY]);
    drag = { x: e.offsetX, y: e.offsetY, pan: e.shiftKey || e.button === 2, moved: false, pinch: pointers.size === 2 ? pinchDist() : null, dist: cam.dist };
  });
  canvas.addEventListener('pointermove', e => {
    if (pointers.has(e.pointerId)) pointers.set(e.pointerId, [e.offsetX, e.offsetY]);
    if (!drag) return;
    if (pointers.size === 2 && drag.pinch) { cam.dist = clamp(drag.dist * drag.pinch / pinchDist(), 30, 3000); drag.moved = true; draw(); return; }
    const dx = e.offsetX - drag.x, dy = e.offsetY - drag.y;
    if (Math.abs(dx) + Math.abs(dy) > 3) drag.moved = true;
    if (drag.pan) {
      const B = basis(), k = cam.dist / B.focal;
      cam.cx -= (B.r[0] * dx - B.u[0] * dy) * k; cam.cy -= (B.r[1] * dx - B.u[1] * dy) * k; cam.cz = Math.max(0, cam.cz + B.u[2] * dy * k);
    } else { cam.yaw += dx * 0.4; cam.pitch = clamp(cam.pitch + dy * 0.3, 3, 88); }
    drag.x = e.offsetX; drag.y = e.offsetY; draw();
  });
  canvas.addEventListener('pointerup', e => {
    pointers.delete(e.pointerId);
    if (drag && !drag.moved && onPick) onPick(pick(e.offsetX, e.offsetY));
    if (!pointers.size) drag = null;
  });
  canvas.addEventListener('wheel', e => { e.preventDefault(); cam.dist = clamp(cam.dist * Math.exp(e.deltaY * 0.0012), 30, 3000); draw(); }, { passive: false });
  const pinchDist = () => { const [a, b] = [...pointers.values()]; return Math.hypot(a[0] - b[0], a[1] - b[1]) || 1; };

  return {
    /** model: { prisms, cells: { facade, roof }, colourOf(cell) → [r,g,b] | null } */
    setModel(m, { keepCamera = false } = {}) {
      polys = [];
      for (const p of m.prisms) {
        if (p.target) continue;
        const shade = (n) => 0.55 + 0.45 * Math.max(0, dot(n, light));
        const r = p.ring;
        for (let i = 0; i < r.length; i++) {
          const a = r[i], b = r[(i + 1) % r.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
          if (L < 0.5) continue;
          const n = [(b[1] - a[1]) / L, -(b[0] - a[0]) / L, 0], k = shade(n);
          polys.push({ v: [[a[0], a[1], p.zMin], [b[0], b[1], p.zMin], [b[0], b[1], p.zMax], [a[0], a[1], p.zMax]], c: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (p.zMin + p.zMax) / 2], n, wall: true,
            fill: () => rgb([150, 162, 172], k * 0.8, 0.92), stroke: () => 'rgba(20,32,41,.35)' });
        }
        const cz = p.zMax, c = centroidOf(r);
        polys.push({ v: r.map(([x, y]) => [x, y, cz]), c: [c[0], c[1], cz], fill: () => rgb([186, 196, 204], 1, 0.95), stroke: () => 'rgba(20,32,41,.35)' });
      }
      for (const cell of [...m.cells.facade, ...m.cells.roof]) {
        const q = cell.quad, c = [(q[0][0] + q[2][0]) / 2, (q[0][1] + q[2][1]) / 2, (q[0][2] + q[2][2]) / 2];
        const n = cell.group === 'roof' ? [0, 0, 1] : [Math.sin(cell.az * Math.PI / 180), Math.cos(cell.az * Math.PI / 180), 0];
        polys.push({ v: q, c, n, wall: cell.group !== 'roof', cell, group: cell.group, pickable: true, bias: -0.5,
          fill: hl => { const col = m.colourOf(cell); return col ? rgb(col, 1) : hl ? 'rgba(120,130,140,.95)' : 'rgba(80,90,100,.95)'; },
          stroke: hl => (hl ? 'rgba(255,255,255,.9)' : 'rgba(10,20,30,.25)') });
      }
      if (!keepCamera) {
        const T = m.prisms.filter(p => p.target), all = T.flatMap(p => p.ring);
        const c = centroidOf(all.length > 2 ? all : [[0, 0], [1, 0], [0, 1]]);
        const h = Math.max(...T.map(p => p.zMax));
        cam.cx = c[0]; cam.cy = c[1]; cam.cz = h * 0.45; cam.dist = Math.max(160, h * 3.2);
      }
      draw();
    },
    recolour(colourOf) { for (const P of polys) if (P.cell) P.fill = hl => { const col = colourOf(P.cell); return col ? rgb(col, 1) : hl ? 'rgba(120,130,140,.95)' : 'rgba(80,90,100,.95)'; }; draw(); },
    select(g) { selectedGroup = g; draw(); },
    view(yawDeg) { cam.yaw = yawDeg; draw(); },
    snapshot() { render(); return canvas.toDataURL('image/jpeg', 0.85); },
    redraw: draw,
  };
}

function centroidOf(r) { let x = 0, y = 0; for (const p of r) { x += p[0]; y += p[1]; } return [x / r.length, y / r.length]; }
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
function norm(a) { const l = Math.hypot(...a) || 1; return a.map(x => x / l); }
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
function inPoly(x, y, pts) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
