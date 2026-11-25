import {readerPages,readerPage} from './reader-pages.js';
import {storyArt} from './photo-renderer.js';
import {sectionPages} from './section-pages.js';
import {sections,deskDetails} from './israel-sections.js';
import {editorialPages,articleHref} from './editorial-pages.js';
import {groupsFor,groupDescriptions} from './article-groups.js';
const readableDate=(v,lang)=>{const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(String(v??'').slice(0,10));if(!m)return String(v??'');const d=new Date(Date.UTC(+m[1],+m[2]-1,+m[3],12));return d.toLocaleDateString(lang==='he'?'he-IL':'en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'});};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pageIntros={
 israel:{en:'Solar energy in Israel, in five desks: the places, the companies, the numbers, the research and the communities.',he:'אנרגיה סולארית בישראל, בחמישה מדורים: המקומות, החברות, המספרים, המחקר והקהילות.'},
 world:{en:'Solar stories from outside Israel: research, projects and policy elsewhere, and what they can and cannot tell us here.',he:'כתבות סולאריות מחוץ לישראל: מחקר, פרויקטים ומדיניות במקומות אחרים, ומה הם יכולים, ומה אינם יכולים, ללמד אותנו כאן.'}
};
const byDate=list=>[...list].sort((a,b)=>(b.date||'').localeCompare(a.date||''));
export function magazinePage(stories,metadata,lang,{topic='all',section='all',page='',article='',state='ready'}={}){
 const t=x=>x?.[lang]||x?.en||'';
 const bi=(en,he)=>lang==='he'?he:en;
 const back=`<p class="mag-breadcrumb"><a href="./index.html?lang=${lang}">${bi('Home','בית')}</a> / ${bi('SPFI','SPFI')}</p>`;
 if(article)return back+`<div id="article-page-content" class="standalone-article" aria-live="polite"><p>${bi('Loading article…','טוען כתבה…')}</p></div>`;
 const title=section!=='all'?sections[section]:topic!=='all'?sectionPages[topic]:editorialPages[page];
 const desc=section!=='all'?deskDetails[section]:topic!=='all'?sectionPages[topic].intro:pageIntros[page]||null;
 const titleHTML=`${back}<div class="mag-section-head"><h1>${esc(t(title))}</h1></div>${desc?`<p class="mag-note">${esc(t(desc))}</p>`:''}`;
 const card=(s,i,a,h='h2')=>`<article class="mag-card">${storyArt(s.id,lang,'section')}<div class="mag-card-copy"><span class="tag">${esc(t(sectionPages[s.topic]))}</span><${h}><a href="${articleHref(s.id,lang)}">${esc(t(s.title))}</a></${h}><p>${esc(t(s.excerpt))}</p><div class="story-meta">${esc(t(s.type))}${s.date?` · ${bi('Source dated','תאריך המקור')} ${esc(readableDate(s.date,lang))}`:''}</div></div></article>`;
 if(Object.hasOwn(readerPages,page))return titleHTML+readerPage(page,lang);
 if(['learn','organisations','about'].includes(page))return titleHTML;
 if(page==='israel'){
  const desks=Object.entries(sections).map(([id,name])=>{const list=byDate(stories.filter(s=>metadata[s.id]?.section===id));return `<section class="mag-section" id="${id}" aria-labelledby="${id}-title"><div class="mag-section-head"><h2 id="${id}-title"><a href="./israel-${id}.html?lang=${lang}">${esc(t(name))}</a></h2><a href="./israel-${id}.html?lang=${lang}">${bi('All','לכל')} ${list.length} ${bi('stories','הכתבות')} ↗</a></div><p class="mag-note">${esc(t(deskDetails[id]))}</p><div class="mag-grid">${list.slice(0,3).map(s=>card(s,0,0,"h3")).join("")}</div></section>`;}).join('');
  const total=stories.filter(s=>metadata[s.id]?.scope==='israel').length;
  return `${titleHTML}<p class="minor" aria-live="polite">${state==='loading'?bi('Loading stories…','טוען כתבות…'):`${total} ${bi('stories about Israel. The newest three from each desk:','כתבות על ישראל. שלוש החדשות ביותר מכל מדור:')}`}</p><nav class="desk-nav" aria-label="${bi('Israel desks','מדורי ישראל')}">${Object.entries(sections).map(([id,name])=>`<a href="#${id}">${esc(t(name))}</a>`).join('')}</nav>${desks}`;
 }
 let items=stories.filter(s=>(topic==='all'||s.topic===topic)&&(section==='all'||metadata[s.id]?.section===section));
 let note='';
 if(page==='opinion'){items=items.filter(s=>groupsFor(metadata[s.id]).includes('opinion'));note=t(groupDescriptions.opinion);}
 if(page==='popular'){items=items.filter(s=>groupsFor(metadata[s.id]).includes('trending'));note=t(groupDescriptions.trending);}
 if(page==='sponsored'){items=items.filter(s=>groupsFor(metadata[s.id]).includes('sponsored'));note=bi('No paid sponsored articles are available. The following guides are promoted by SPFI through editorial selection.','אין כתבות בחסות בתשלום. המדריכים הבאים מקודמים על ידי SPFI כבחירה מערכתית.');}
 if(page==='press'){items=items.filter(s=>groupsFor(metadata[s.id]).includes('press'));note=t(groupDescriptions.press);}
 if(page==='world'){items=byDate(items.filter(s=>metadata[s.id]?.scope==='international'));note=bi('Newest first, by the date of the original source.','החדשות ביותר תחילה, לפי תאריך המקור.');}
 if(page==='latest'){items=[...items].sort((a,b)=>(b.date||'').localeCompare(a.date||''));note=bi('Ordered by available source date. Articles without a source date follow dated entries.','לפי תאריך המקור הזמין. כתבות ללא תאריך מקור מופיעות אחרי הכתבות המתוארכות.');}
 const cards=items.map(card).join('');
 return `${titleHTML}${note?`<p class="mag-note">${esc(note)}</p>`:''}<p class="minor" aria-live="polite">${state==='loading'?bi('Loading stories…','טוען כתבות…'):`${items.length} ${bi('stories','כתבות')}`}</p><section class="mag-section mag-listing"><div class="mag-grid">${cards}</div>${!items.length&&state==='ready'&&page!=='press'?`<p class="mag-empty">${bi('No stories in this section yet.','עדיין אין כתבות במדור הזה.')}</p>`:''}</section>`;
}
