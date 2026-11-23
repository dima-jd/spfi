import {readerPages} from './reader-pages.js';
export const editorialPages={
 ...readerPages,
 latest:{en:'Latest updates',he:'עדכונים אחרונים'},
 opinion:{en:'Opinion and Analysis',he:'דעה וניתוח'},
 sponsored:{en:'Sponsored',he:'תוכן ממומן'},
 press:{en:'Announcements',he:'הודעות רשמיות'},
 popular:{en:'Editor’s picks',he:'בחירת העורך'},
 learn:{en:'Solar, explained',he:'סולארי, בפשטות'},
 organisations:{en:'Organisations working with solar',he:'ארגונים העוסקים באנרגיה סולארית'},
 about:{en:'About SPFI',he:'אודות SPFI'}
};
export const editorialHref=(page,lang='en')=>`./${page}.html?lang=${lang}`;
export const articleHref=(id,lang='en')=>`./article-${id}.html?lang=${lang}`;
