import Clarity from './vendor/clarity/index.js';
import {clarityProjectId,safeClarityMessage} from './clarity-policy.js';
// An opaque-origin sandbox cannot inspect the parent DOM or storage. Its own
// URL/title are fixed and its body contains no user content.
if (window.parent !== window && !window.__spfiClarityStarted) {
  window.__spfiClarityStarted = true;
  // Opaque sandbox documents cannot use cookies. The hosted recorder attempts
  // cookie access even here; provide an empty, non-persistent cookie surface
  // instead of weakening the sandbox or granting same-origin access.
  Object.defineProperty(document, 'cookie', {get: () => '', set: () => {}, configurable: false});
  const live = ['spfi.co.il','www.spfi.co.il','agripv.spfi.co.il'].includes(location.hostname);
  if (live) Clarity.init(clarityProjectId);
  else window.clarity = function(){ (window.clarity.q ||= []).push([...arguments]); };
  window.addEventListener('message', event => {
    if (event.source !== window.parent || event.data?.type !== 'spfi-clarity') return;
    const message = safeClarityMessage(event.data);
    try {
      for (const [key,value] of Object.entries(message.tags)) Clarity.setTag(key,value);
      if (message.event) Clarity.event(message.event);
    } catch { /* Blocked analytics is non-fatal. */ }
  });
  window.parent.postMessage('spfi-clarity-ready','*');
}
