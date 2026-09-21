import {readerPages,readerPage} from './reader-pages.js';
import {storyArt} from './photo-renderer.js';
import {sectionPages} from './section-pages.js';
import {sections,deskDetails} from './israel-sections.js';
import {editorialPages,articleHref} from './editorial-pages.js';
import {groupsFor,groupDescriptions} from './article-groups.js';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function magazinePage(stories,metadata,lang,{topic='all',section='all',page='',article='',state='ready'}={}){
 const t=x=>x?.[lang]||x?.en||'';
 const bi=(en,he)=>lang==='he'?he:en;
 const back=`<p class="mag-breadcrumb"><a href="./index.html?lang=${lang}">${bi('Home','בית')}</a> / ${bi('SPFI','SPFI')}</p>`;
 if(article)return back+`<div id="article-page-content" class="standalone-article" aria-live="polite"><p>${bi('Loading article…','טוען כתבה…')}</p></div>`;
 const title=section!=='all'?sections[section]:topic!=='all'?sectionPages[topic]:editorialPages[page];
 const desc=section!=='all'?deskDetails[section]:topic!=='all'?sectionPages[topic].intro:null;
 const titleHTML=`${back}<div class="mag-section-head"><h1>${esc(t(title))}</h1></div>${desc?`<p class="mag-note">${esc(t(desc))}</p>`:''}`;
 if(Object.hasOwn(readerPages,page))return titleHTML+readerPage(page,lang);
 if(['learn','organisations','about'].includes(page))return titleHTML;
 let items=stories.filter(s=>(topic==='all'||s.topic===topic)&&(section==='all'||metadata[s.id]?.section===section));
 let note='';
 if(page==='opinion'){items=items.filter(s=>groupsFor(metadata[s.id]).includes('opinion'));note=t(groupDescriptions.opinion);}
 if(page==='popular'){items=items.filter(s=>groupsFor(metadata[s.id]).includes('trending'));note=t(groupDescriptions.trending);}
 if(page==='sponsored'){items=items.filter(s=>groupsFor(metadata[s.id]).includes('sponsored'));note=bi('No paid sponsored articles are available. The following guides are promoted by SPFI through editorial selection.','אין כתבות בחסות בתשלום. המדריכים הבאים מקודמים על ידי SPFI כבחירה מערכתית.');}
 if(page==='press'){items=items.filter(s=>groupsFor(metadata[s.id]).includes('press'));note=t(groupDescriptions.press);}
 if(page==='latest'){items=[...items].sort((a,b)=>(b.date||'').localeCompare(a.date||''));note=bi('Ordered by available source date. Articles without a source date follow dated entries.','לפי תאריך המקור הזמין. כתבות ללא תאריך מקור מופיעות אחרי הכתבות המתוארכות.');}
 const cards=items.map(s=>`<article class="mag-card">${storyArt(s.id,lang,'section')}<div class="mag-card-copy"><span class="tag">${esc(t(sectionPages[s.topic]))}</span><h2><a href="${articleHref(s.id,lang)}">${esc(t(s.title))}</a></h2><p>${esc(t(s.excerpt))}</p><div class="story-meta">${esc(t(s.type))}${s.date?` · ${bi('Source dated','תאריך המקור')} ${esc(s.date)}`:''}</div></div></article>`).join('');
 return `${titleHTML}${note?`<p class="mag-note">${esc(note)}</p>`:''}<p class="minor" aria-live="polite">${state==='loading'?bi('Loading stories…','טוען כתבות…'):`${items.length} ${bi('stories','כתבות')}`}</p><section class="mag-section mag-listing"><div class="mag-grid">${cards}</div>${!items.length&&state==='ready'&&page!=='press'?`<p class="mag-empty">${bi('No stories in this section yet.','עדיין אין כתבות במדור הזה.')}</p>`:''}</section>`;
}
