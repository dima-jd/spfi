import {publicContentIds, publicPages} from './analytics-public-data.js';

import {initClarity, trackClarity} from './clarity.js';

export const measurementId = 'G-GGLLJKXHYX';
const events = new Set(['article_open','article_read_75','map_open','map_search','map_layer_change','project_open','source_view','share_click','newsletter_signup','correction_submit','contribution_submit','survey_submit','search_no_result','map_error']);
const choices = {
  content_id: new Set(publicContentIds),
  domain: new Set(['agripv','research','industry','people','environment','storage','projects','plans','candidates','industrial','public','site']),
  language: new Set(['en','he']),
  region: new Set(['north','south','haifa','jerusalem','central','telaviv']),
  project_status: new Set(['operating','construction','planning','permitting','research','announced','hold','cancelled','unknown']),
  source_type: new Set(['article_reference','map_evidence'])
};

// Only reviewed public IDs and enumerated metadata are accepted. Never pass URLs,
// search text, error messages, form values, records or coordinates to Google.
export function sanitizeParams(params = {}) {
  const clean = {};
  for (const [key, allowed] of Object.entries(choices)) {
    if (typeof params?.[key] === 'string' && allowed.has(params[key])) clean[key] = params[key];
  }
  return clean;
}

function pageParams() {
  const mapHost = window.location.hostname === 'agripv.spfi.co.il';
  const path = mapHost ? '/agripv/' : window.location.pathname;
  const safePath = publicPages.includes(path) ? path : '/';
  return {page_location: 'https://spfi.co.il' + safePath, page_referrer: '', page_title: safePath.startsWith('/agripv') ? 'AGRIPV' : 'SPFI'};
}

export function trackEvent(name, params = {}) {
  if (!events.has(name) || typeof window === 'undefined') return;
  trackClarity(name, sanitizeParams(params));
  try {
    if (typeof window.gtag !== 'function') return;
    window.gtag('event', name, {...sanitizeParams(params), ...pageParams(), send_to: measurementId});
  } catch { /* Analytics must never break a reader action. */ }
}

export function initAnalytics() {
  if (typeof window === 'undefined' || window.__spfiAnalytics) return;
  window.__spfiAnalytics = true;
  try { initClarity(); } catch { /* Recording blocked; keep GA4 and the app usable. */ }
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function(){ window.dataLayer.push(arguments); };
  window.gtag('js', new Date());
  window.gtag('set', {...pageParams(), allow_google_signals: false, allow_ad_personalization_signals: false});
  window.gtag('config', measurementId, {...pageParams(), send_page_view: false, allow_google_signals: false, allow_ad_personalization_signals: false});
  window.gtag('event', 'page_view', {...pageParams(), send_to: measurementId});
  // Local previews exercise the same queue without polluting production reports.
  if (!['spfi.co.il','www.spfi.co.il','agripv.spfi.co.il'].includes(window.location.hostname)) return;
  const tag = document.createElement('script');
  tag.async = true;
  tag.src = 'https://www.googletagmanager.com/gtag/js?id=' + measurementId;
  tag.referrerPolicy = 'no-referrer';
  document.head.append(tag);
}

const readers = new WeakMap();
export function trackArticle(root, article, language) {
  readers.get(root)?.abort();
  const controller = new AbortController();
  readers.set(root, controller);
  const params = {content_id: article.id, domain: article.topic, language};
  trackEvent('article_open', params);
  root.addEventListener('click', event => {
    if (event.target.closest('.source-links a, .image-credit a')) trackEvent('source_view', {...params, source_type: 'article_reference'});
  }, {signal: controller.signal});
  const dialog = root.closest('dialog');
  let read = false;
  const check = () => {
    const body = root.querySelector('.reader-copy');
    if (!root.isConnected) { controller.abort(); return; }
    if (read || !body || (dialog && !dialog.open)) return;
    const box = body.getBoundingClientRect();
    const viewport = dialog ? dialog.getBoundingClientRect() : {top: 0, bottom: window.innerHeight};
    const milestone = box.top + box.height * 0.75;
    if (box.height > 0 && milestone >= Math.max(0, viewport.top) && milestone <= Math.min(window.innerHeight, viewport.bottom)) {
      read = true;
      trackEvent('article_read_75', params);
    }
  };
  // Capture scrolls inside the modal as well as ordinary document scrolling.
  document.addEventListener('scroll', check, {capture: true, passive: true, signal: controller.signal});
  window.addEventListener('resize', check, {signal: controller.signal});
  dialog?.addEventListener('close', () => controller.abort(), {once: true, signal: controller.signal});
  requestAnimationFrame(check);
}

initAnalytics();
