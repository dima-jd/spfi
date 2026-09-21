import {readerPages} from './reader-pages.js';
export const editorialPages={
 ...readerPages,
 latest:{en:'Latest news',he:'חדשות אחרונות'},
 opinion:{en:'Opinion and Analysis',he:'דעה וניתוח'},
 sponsored:{en:'Sponsored',he:'תוכן ממומן'},
 press:{en:'Press Release',he:'הודעות לעיתונות'},
 popular:{en:'Most Popular',he:'הכתבות הפופולריות'},
 learn:{en:'Solar, explained',he:'סולארי, בפשטות'},
 organisations:{en:'Organisations working with solar',he:'ארגונים העוסקים באנרגיה סולארית'},
 about:{en:'About SPFI',he:'אודות SPFI'}
};
export const editorialHref=(page,lang='en')=>`./${page}.html?lang=${lang}`;
export const articleHref=(id,lang='en')=>`./article-${id}.html?lang=${lang}`;
