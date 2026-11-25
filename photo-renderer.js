import {photos,assignments} from './photo-catalog.js';
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// Topic photos used when a story must have a picture (the home page's newest story) but has none assigned.
const topicFallback={agripv:'field',research:'cells',industry:'panel',people:'people-panels',environment:'grass',storage:'grid'};
export function storyArt(id,lang='en',mode='article',fallbackTopic=null){
 const key=photos[assignments[id]]?assignments[id]:fallbackTopic?(topicFallback[fallbackTopic]||'panel'):null;
 const photo=photos[key];if(!photo)return '';
 const alt=escape(photo.alt[lang]||photo.alt.en);
 const src=photo.src.replace('w=1400',mode==='thumb'?'w=320':mode==='section'?'w=600':'w=1400');
 const note=lang==='he'?'צילום להמחשה; אינו מציג את הפרויקט או המחקר שבכתבה.':'Illustrative photo; not the project or research described.';
 const credit=escape(lang==='he'&&photo.creditHe?photo.creditHe:photo.credit);
 const attribution=photo.sourceUrl?`<a href="${escape(photo.sourceUrl)}" target="_blank" rel="noopener noreferrer">${credit} / Unsplash</a>`:credit;
 return `<figure class="story-photo photo-${mode} subject-${key}"><img src="${escape(src)}" ${mode==='article'||mode==='lead'?'fetchpriority="high"':'loading="lazy"'} decoding="async" alt="${alt}" width="1400" height="800"><figcaption>${mode==='thumb'?'':`${note} `}${attribution}</figcaption></figure>`;
}
