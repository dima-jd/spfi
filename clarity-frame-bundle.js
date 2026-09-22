(()=>{
function injectScript(projectId) {
  try {
    (function (c, l, a, r, i, t, y) {
      if (l.getElementById("clarity-script")) {
        return;
      }
      c[a] = c[a] ||
        function () {
          (c[a].q = c[a].q || []).push(arguments);
        };
      t = l.createElement(r);
      t.async = 1;
      t.src = "https://www.clarity.ms/tag/" + i + "?ref=npm";
      t.id = "clarity-script"
      y = l.getElementsByTagName(r)[0];
      y.parentNode.insertBefore(t, y);
    })(window, document, "clarity", "script", projectId);
    return;
  } catch (error) {
    return;
  }
};



const Clarity = {
    init(projectId) {
        injectScript(projectId, 'clarity-script');
    },

    setTag(key, value) {
        window.clarity('set', key, value);
    },

    identify(customerId, customSessionId, customPageId, friendlyName) {
        window.clarity('identify', customerId, customSessionId, customPageId, friendlyName);
    },

    consent(consent = true) {
        window.clarity('consent', consent);
    },

    consentV2(consentOptions = { ad_Storage: 'granted', analytics_Storage: 'granted' }) {
        window.clarity('consentv2', consentOptions);
    },

    upgrade(reason) {
        window.clarity('upgrade', reason);
    },

    event(eventName) {
        window.clarity('event', eventName);
    },
};



const clarityProjectId = 'ymfx2g1k8j';
const clarityEvents = new Set(['map_open','project_open','source_view','correction_submit','contribution_submit']);
const domains = new Set(['agripv','research','industry','people','environment','storage','projects','plans','candidates','industrial','public','site']);
const types = new Set(['article','map','project','page']);
function safeClarityMessage(input = {}) {
  const tags = {};
  if (['en','he'].includes(input.tags?.language)) tags.language = input.tags.language;
  if (domains.has(input.tags?.domain)) tags.domain = input.tags.domain;
  if (types.has(input.tags?.content_type)) tags.content_type = input.tags.content_type;
  return {type:'spfi-clarity', tags, ...(clarityEvents.has(input.event) ? {event:input.event} : {})};
}



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

})();
