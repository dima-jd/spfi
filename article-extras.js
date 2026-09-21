import {newsletterHTML} from './reader-pages.js';
import {articleHref} from './editorial-pages.js';
import {storyArt} from './photo-renderer.js';
import {matchesGroup} from './article-groups.js';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export function relatedArticles(current,stories,metadata){
 const section=metadata[current.id]?.section;
 return stories.filter(s=>s.id!==current.id).map(s=>({story:s,score:(s.topic===current.topic?2:0)+(section&&metadata[s.id]?.section===section?1:0)})).filter(s=>s.score>0).sort((a,b)=>b.score-a.score||a.story.id.localeCompare(b.story.id)).slice(0,3).map(s=>s.story);
}

export function articleExtras(current,stories,metadata,lang='en'){
 const bi=(en,he)=>lang==='he'?he:en;
 const related=relatedArticles(current,stories,metadata);
 const urgent=stories.filter(s=>s.id!==current.id&&matchesGroup(metadata[s.id],'breaking'));
 const link=s=>`<a href="${articleHref(s.id,lang)}">${esc(s.title[lang]||s.title.en)}</a>`;
 return {
 related:related.length?`<section class="article-related" aria-labelledby="related-heading"><h2 id="related-heading">${bi('Related articles','כתבות קשורות')}</h2><div class="related-grid">${related.map(s=>`<article>${storyArt(s.id,lang,'section')}<h3>${link(s)}</h3></article>`).join('')}</div></section>`:'',
 sidebar:`<aside class="article-sidebar" aria-label="${bi('More from SPFI','עוד מ־SPFI')}"><section class="article-urgent"><span class="sidebar-kicker">SPFI / ${bi('EDITOR’S DESK','שולחן המערכת')}</span><h2>${bi('Urgent posts','כתבות בעדיפות')}</h2><p class="minor">${bi('Editorial priorities · Background guides, not breaking-news alerts.','בעדיפות מערכתית · מדריכי רקע, לא התרעות על חדשות מתפרצות.')}</p><ol>${urgent.map(s=>`<li>${link(s)}</li>`).join('')}</ol></section><section class="article-newsletter" aria-labelledby="newsletter-heading"><span class="sidebar-kicker">${bi('THE SPFI NEWSLETTER','הניוזלטר של SPFI')}</span><h2 id="newsletter-heading">${bi('A considered update on solar','עדכון שקול על אנרגיה סולארית')}</h2><p>${bi('Selected stories, project updates, and questions worth following.','כתבות נבחרות, עדכוני פרויקטים ושאלות שכדאי לעקוב אחריהן.')}</p>${newsletterHTML(lang)}</section></aside>`
 };
}
