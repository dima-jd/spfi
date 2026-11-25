// Number formatting shared by the app and the report.
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nf = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
export const int = n => (n == null || !Number.isFinite(n) ? '–' : nf.format(Math.round(n)));
export const dec = (n, d = 1) => (n == null || !Number.isFinite(n) ? '–' : n.toFixed(d));

/** Money in ILS with k/M suffixes. */
export function ils(n) {
  if (n == null || !Number.isFinite(n)) return '–';
  const a = Math.abs(n), s = n < 0 ? '−' : '';
  if (a >= 1e6) return `${s}₪${(a / 1e6).toFixed(a >= 1e7 ? 1 : 2)}M`;
  if (a >= 1e3) return `${s}₪${Math.round(a / 1e3)}k`;
  return `${s}₪${Math.round(a)}`;
}
export const mwh = kwh => (kwh >= 1e4 ? `${dec(kwh / 1000, 0)} MWh` : `${dec(kwh / 1000, 1)} MWh`);
export const years = y => (y == null ? 'none in 25 yr' : `${dec(y, 1)} yr`);
export const pct = (x, d = 0) => (x == null || !Number.isFinite(x) ? '–' : `${(x * 100).toFixed(d)}%`);

/** "a – b" for a [conservative, central, optimistic] range, ordered low→high. */
export function span(range, key, fmt) {
  const v = range.map(r => r[key]);
  if (key === 'payback') { const [w, , b] = v; return w == null && b == null ? 'none' : `${b == null ? '–' : dec(b, 1)} – ${w == null ? '>25' : dec(w, 1)} yr`; }
  const lo = Math.min(...v.filter(Number.isFinite)), hi = Math.max(...v.filter(Number.isFinite));
  return `${fmt(lo)} – ${fmt(hi)}`;
}

export const GROUP_LABEL = { roof: 'Roof', S: 'South facade', E: 'East facade', W: 'West facade', N: 'North facade' };
export const SLOT_LABEL = { roof: 'roof', opaque: 'opaque wall', window: 'over windows' };
