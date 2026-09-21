const art={
 'israel-100000-solar-roofs-programme':['rooftops','Solar panels above a neighbourhood','לוחות סולאריים מעל שכונת מגורים'],
 'israel-rooftop-solar-government-help':['rooftops','Solar panels above a neighbourhood','לוחות סולאריים מעל שכונת מגורים'],
 'solar-rooftop-plan-explained-simply':['rooftops','Solar panels above a neighbourhood','לוחות סולאריים מעל שכונת מגורים'],
 'government-solar-calculator-guide':['rooftops','Solar panels above a neighbourhood','לוחות סולאריים מעל שכונת מגורים'],
 'maale-gilboa-grapes-first-season':['agripv','Solar canopies above rows of crops','קירוי סולארי מעל שורות גידולים'],
 'shade-crops-weather':['agripv','Solar canopies above rows of crops','קירוי סולארי מעל שורות גידולים'],
 'antora-carbon-heat-storage':['storage','Sunlight, stored energy and evening demand','אור שמש, אנרגיה אגורה וביקוש בשעות הערב'],
 'cmblu-long-duration-storage':['storage','Sunlight, stored energy and evening demand','אור שמש, אנרגיה אגורה וביקוש בשעות הערב']
};
export function storyArt(id,lang='en'){
 const item=art[id];if(!item)return '';
 return `<figure class="story-illustration"><img src="./assets/${item[0]}.svg" width="1200" height="480" alt="${item[lang==='he'?2:1]}" decoding="async"><figcaption>${lang==='he'?'איור רעיוני מקורי של SPFI — לא צילום של הפרויקט.':'Original SPFI conceptual illustration — not a photograph of the project.'}</figcaption></figure>`;
}
