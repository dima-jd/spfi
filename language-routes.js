// Only public SPFI page routes are localized; map and external URLs stay intact.
export function languagePath(path, lang) {
  const clean = path.replace(/^\/(en|he)(?=\/|$)/, '').replace(/\/index\.html$/, '/');
  if (clean === '/' || clean === '') return `/${lang}/`;
  return `/${lang}/${clean.replace(/^\//, '').replace(/\.html$/, '').replace(/\/$/, '')}/`;
}
export function localizeHref(href, lang, base) {
  if (!href || href.startsWith('#')) return href;
  const url = new URL(href, base);
  if (url.origin !== new URL(base).origin || url.pathname.startsWith('/agripv/')) return href;
  if (!/^\/(?:en|he)(?:\/|$)/.test(url.pathname) && !/^\/(?:[^/]+\.html)?$/.test(url.pathname)) return href;
  if (/\/(?:version-a|comparison)\.html$/.test(url.pathname)) return href;
  url.pathname = languagePath(url.pathname, lang);
  url.searchParams.delete('lang');
  return url.pathname + url.search + url.hash;
}
export function localizeLinks(root, lang) {
  root.querySelectorAll('a[href]').forEach(a => {
    const href=a.getAttribute('href');
    a.setAttribute('href',href.startsWith('#')?location.pathname+location.search+href:localizeHref(href, lang, document.baseURI));
  });
}
export function switchLanguage(lang) {
  const url = new URL(location.href);
  url.pathname = languagePath(url.pathname, lang);
  url.searchParams.delete('lang');
  location.assign(url.pathname + url.search + url.hash);
}
