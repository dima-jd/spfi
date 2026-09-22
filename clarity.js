import {safeClarityMessage} from './clarity-policy.js';
// The hosted recorder never runs in the application document. Masking alone
// does not remove sensitive URLs, SVG map geometry, or arbitrary attributes.
export function initClarity() {
  if (typeof window === 'undefined' || !document.documentElement?.setAttribute) return;
  if (window.__spfiClarity) return window.__spfiClarity;
  document.documentElement.setAttribute('data-clarity-mask','true');
  const frame = document.createElement('iframe');
  frame.hidden = true;
  frame.title = 'SPFI privacy-isolated analytics';
  frame.setAttribute('sandbox','allow-scripts');
  frame.referrerPolicy = 'no-referrer';
  frame.src = new URL('./clarity-frame.html', import.meta.url).href;
  const state = {frame, ready:false, queue:[]};
  window.__spfiClarity = state;
  window.addEventListener('message', event => {
    if (event.source !== frame.contentWindow || event.data !== 'spfi-clarity-ready' || state.ready) return;
    state.ready = true;
    for (const message of state.queue.splice(0)) frame.contentWindow.postMessage(message,'*');
  });
  // No parent URL, referrer, title, IDs, link targets, documents or text cross
  // this boundary. '*' is required because the sandbox has an opaque origin.
  document.body.append(frame);
  const language = () => sendClarity({tags:{language:document.documentElement.lang === 'he' ? 'he' : 'en'}});
  new MutationObserver(language).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
  language();
  return state;
}
function sendClarity(input) {
  const state = window.__spfiClarity;
  if (!state) return;
  const message = safeClarityMessage(input);
  if (state.ready) state.frame.contentWindow.postMessage(message,'*');
  else if (state.queue.length < 100) state.queue.push(message);
}
export function trackClarity(name, params = {}) {
  if (typeof window === 'undefined') return;
  try {
    initClarity();
    const content_type = name.startsWith('article_') ? 'article' : name === 'project_open' ? 'project' : name.startsWith('map_') ? 'map' : undefined;
    sendClarity({event:name,tags:{language:params.language,domain:params.domain,content_type}});
  } catch { /* Analytics cannot interrupt site functionality. */ }
}
