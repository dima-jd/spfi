import {articleHref,editorialHref} from './editorial-pages.js';
import {storyArt} from './photo-renderer.js';
import {sections,deskHref} from './israel-sections.js';
import {sectionPages} from './section-pages.js';
import {groupsFor,groupDescriptions} from './article-groups.js';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function comparisonLayout(stories,metadata,lang){
 const t=x=>x?.[lang]||x?.en||'';
 const bi=(en,he)=>lang==='he'?he:en;
 const card=(s,mode='card')=>`<article class="mag-card ${mode}">${mode==='brief'?'':storyArt(s.id,lang,mode==='lead'?'lead':'section')}<div class="mag-card-copy"><span class="tag">${esc(t(sectionPages[s.topic]))}</span><h3><a href="${articleHref(s.id,lang)}">${esc(t(s.title))}</a></h3>${mode==='brief'?'':`<p>${esc(t(s.excerpt))}</p>`}<div class="story-meta">${esc(t(s.type))}${s.date?` · ${bi('Source dated','תאריך המקור')} ${esc(s.date)}`:''}</div></div></article>`;
 const group=id=>stories.filter(s=>groupsFor(metadata[s.id]).includes(id));
 const latest=[...stories].sort((a,b)=>(b.date||'').localeCompare(a.date||''));
 const head=(id,en,he,note='',link=['latest','opinion','sponsored','press','popular'].includes(id)?editorialHref(id,lang):'')=>`<div class="mag-section-head"><h2 id="${id}-title">${bi(en,he)}</h2>${link?`<a href="${link}">${bi('View all','לכל הכתבות')} ↗</a>`:''}</div>${note?`<p class="mag-note">${note}</p>`:''}`;
 const cards=items=>`<div class="mag-grid">${items.map(s=>card(s)).join('')}</div>`;
 const intro=`<section class="home-intro" aria-labelledby="home-title"><h1 id="home-title">${bi('SPFI — Solar Platform for Israel','SPFI — הפלטפורמה הסולארית של ישראל')}</h1><p>${bi('Independent, source-based reporting on solar energy in Israel: projects, planning, research, agrivoltaics and the grid, in English and Hebrew. Every story names its sources.','דיווח עצמאי ומבוסס מקורות על אנרגיה סולארית בישראל: פרויקטים, תכנון, מחקר, אגרו-וולטאיקה ורשת החשמל, בעברית ובאנגלית. בכל כתבה מצוינים המקורות.')}</p><p class="home-links"><a href="https://agripv.spfi.co.il/?lang=${lang}">${bi('Explore the AgriPV map','למפת AgriPV')} ↗</a><a href="./israel-solar-in-numbers.html?lang=${lang}">${bi('Solar in numbers','סולארי במספרים')}</a><a href="${editorialHref('methods',lang)}">${bi('How we work','איך אנחנו עובדים')}</a></p></section>`;
 return `${intro}<section class="mag-section" id="latest" aria-labelledby="latest-title">${head('latest','Latest updates','עדכונים אחרונים',bi('Newest first, by the date of the original source.','החדשות ביותר תחילה, לפי תאריך המקור.'))}${latest.length?`<div class="mag-latest"><div>${card(latest[0],'lead')}</div><div class="mag-news-list">${latest.slice(1,5).map(s=>card(s,'brief')).join('')}</div></div><details class="mag-more"><summary>${bi('All stories','כל הכתבות')} (${stories.length})</summary>${cards(latest.slice(5))}</details>`:`<p role="status">${bi('Loading stories…','טוען כתבות…')}</p>`}</section>
 <section class="mag-section" id="opinion" aria-labelledby="opinion-title">${head('opinion','Opinion and Analysis','דעה וניתוח',bi('Source-based reporting with editorial interpretation.','דיווח מבוסס מקורות עם פרשנות מערכתית.'))}${cards(group('opinion'))}</section>
 
 <section class="mag-section" id="press" aria-labelledby="press-title">${head('press','Announcements','הודעות רשמיות',esc(t(groupDescriptions.press)))}${group('press').length?cards(group('press')):`<div class="mag-empty">${bi('No announcements in this section yet.','אין עדיין הודעות במדור זה.')}</div>`}</section>
 <section class="mag-section" id="popular" aria-labelledby="popular-title">${head('popular','Editor’s picks','בחירת העורך',bi('Editor-selected stories to explore. This is not a readership ranking.','כתבות שנבחרו על ידי המערכת. זה אינו דירוג לפי נתוני קריאה.'))}<div class="mag-popular">${group('trending').map(s=>card(s,'brief')).join('')}</div></section>
 ${Object.entries(sections).map(([id,name])=>`<section class="mag-section" id="${id}" aria-labelledby="${id}-title">${head(id,name.en,name.he,'',deskHref(id,lang))}${cards(stories.filter(s=>metadata[s.id]?.section===id))}</section>`).join('')}`;
}
