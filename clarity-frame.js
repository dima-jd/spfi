import Clarity from './vendor/clarity/index.js';
import {clarityProjectId,safeClarityMessage} from './clarity-policy.js';
// An opaque-origin sandbox cannot inspect the parent DOM or storage. Its own
// URL/title are fixed and its body contains no user content.
if (window.parent !== window && !window.__spfiClarityStarted) {
  window.__spfiClarityStarted = true;
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
