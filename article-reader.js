import {trackArticle} from './analytics.js';
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const local=(value,lang)=>value?.[lang]??'';
const safeURL=value=>{
 if(typeof value!=='string'||!value.trim())return '';
 try{const url=new URL(value,'https://spfi.co.il/');return url.protocol==='https:'?url.href:'';}catch{return '';}
};
export function renderArticleBody(article,lang='en'){
 lang=lang==='he'?'he':'en';
 const terms=new Map((article.glossary||[]).filter(x=>/^[a-z0-9-]+$/.test(x.id)&&local(x.term,lang)&&local(x.definition,lang)).map(x=>[x.id,x]));
 let occurrence=0;
 const paragraph=value=>{
  let out='',offset=0;
  for(const match of String(value).matchAll(/\[\[([a-z0-9-]+)\|([^\]\n]+)\]\]/gi)){
   out+=escape(value.slice(offset,match.index));const term=terms.get(match[1].toLowerCase());
   if(!term)out+=escape(match[2]);
   else{const id=`definition-${escape(article.id)}-${++occurrence}`;
    out+=`<span class="glossary-entry"><button type="button" class="glossary-term" aria-expanded="false" aria-controls="${id}" aria-label="${escape((lang==='he'?'הסבר: ':'Explain: ')+match[2])}">${escape(match[2])}</button><span class="glossary-definition" id="${id}" role="note" hidden><strong>${escape(local(term.term,lang))}</strong><span>${escape(local(term.definition,lang))}</span><button type="button" class="glossary-close" aria-label="${lang==='he'?'סגירת ההסבר':'Close explanation'}">×</button></span></span>`;
   }
   offset=match.index+match[0].length;
  }
  return out+escape(value.slice(offset));
 };
 const paragraphs=article.body?.[lang]||[];
 const figures=after=>(article.images||[]).filter(x=>x.afterParagraph===after&&x.rights?.status==='cleared'&&local(x.alt,lang)&&safeURL(x.src)).map(x=>{
  // Relative images remain relative to this site's origin, not the production domain.
  const src=/^(?:https:)?\/\//i.test(x.src)?safeURL(x.src):x.src;
  if(/^[a-z][a-z0-9+.-]*:/i.test(src)&&!src.startsWith('https:'))return '';
  const credit=escape(x.credit||'');const source=safeURL(x.sourceUrl);
  return `<figure class="article-figure"><img src="${escape(src)}" alt="${escape(local(x.alt,lang))}" loading="lazy" decoding="async"><figcaption>${escape(local(x.caption,lang))}${credit?` <span class="image-credit">${lang==='he'?'קרדיט:':'Credit:'} ${source?`<a href="${escape(source)}" target="_blank" rel="noopener noreferrer">${credit}</a>`:credit}</span>`:''}</figcaption></figure>`;
 }).join('');
 const glossary=terms.size?`<details class="article-glossary"><summary>${lang==='he'?'מונחים בכתבה':'Words in this story'} (${terms.size})</summary><dl>${[...terms.values()].map(x=>`<dt>${escape(local(x.term,lang))}</dt><dd>${escape(local(x.definition,lang))}</dd>`).join('')}</dl></details>`:'';
 return `${terms.size?`<p class="glossary-hint">${lang==='he'?'לחצו על מונח מסומן בקו להסבר קצר.':'Select an underlined term for a short explanation.'}</p>`:''}${figures(0)}${paragraphs.map((p,i)=>`<p>${paragraph(p)}</p>${figures(i+1)}`).join('')}${glossary}`;
}
export function bindArticleInteractions(root, article, language){
 if(article)trackArticle(root, article, language);
 const close=button=>{button.setAttribute('aria-expanded','false');root.querySelector(`[id="${CSS.escape(button.getAttribute('aria-controls'))}"]`).hidden=true;};
 root.querySelectorAll('.glossary-term').forEach(button=>button.addEventListener('click',()=>{
  const open=button.getAttribute('aria-expanded')==='true';
  root.querySelectorAll('.glossary-term[aria-expanded="true"]').forEach(close);
  if(!open){button.setAttribute('aria-expanded','true');root.querySelector(`[id="${CSS.escape(button.getAttribute('aria-controls'))}"]`).hidden=false;}
 }));
 root.querySelectorAll('.glossary-close').forEach(button=>button.addEventListener('click',()=>{const trigger=button.closest('.glossary-entry').querySelector('.glossary-term');close(trigger);trigger.focus();}));
 root.onkeydown=event=>{if(event.key==='Escape'){const open=root.querySelector('.glossary-term[aria-expanded="true"]');if(open){event.preventDefault();event.stopPropagation();close(open);open.focus();}}};
}
