// Editorial placement is independent of subject and geographic section.
export const articleGroups = {
  press: {en:'Announcement · SPFI adaptation',he:'הודעה · עיבוד SPFI'},
  breaking: {en:'Urgent · Editorial priorities',he:'דחוף · בעדיפות מערכתית'},
  secondary: {en:'Regular / Secondary Articles',he:'כתבות רגילות / משניות'},
  trending: {en:'Trending · Editor-selected',he:'כתבות חמות · בחירת המערכת'},
  sponsored: {en:'Promoted by SPFI',he:'בקידום SPFI'},
  opinion: {en:'Opinion / Editorial Analysis',he:'דעה / ניתוח מערכתי'}
};
export function groupsFor(metadata) {
  return (metadata?.groups || []).filter(group => Object.hasOwn(articleGroups,group));
}
export function matchesGroup(metadata,group) {
  return group === 'all' || groupsFor(metadata).includes(group);
}

export const groupDescriptions = {
 press: {en:'Original SPFI briefings based on attributed company, project or organisation announcements. Claims remain attributed to their issuers; these are not paid placements.',he:'סקירות מקוריות של SPFI המבוססות על הודעות מיוחסות של חברות, פרויקטים או ארגונים. הטענות מיוחסות למפרסמיהן; זהו אינו תוכן בתשלום.'},
 breaking: {en:'Prioritised by SPFI for policy and rooftop decisions. These are background guides, not reports of a new breaking event.',he:'בעדיפות מערכתית של SPFI להבנת מדיניות והחלטות על גגות סולאריים. אלה מדריכי רקע, ולא דיווחים על אירוע מתפרץ חדש.'},
 secondary: {en:'Regular reporting, supporting stories and background explainers.',he:'דיווח שוטף, כתבות משלימות והסברי רקע.'},
 trending: {en:'Selected by SPFI for research, design and deployment interest; not ranked by readership.',he:'בחירת SPFI לפי עניין במחקר, בעיצוב וביישום; ללא דירוג לפי נתוני קריאה.'},
 sponsored: {en:'Selected for extra visibility by SPFI. This label describes editorial promotion, not paid sponsorship.',he:'נבחרו לחשיפה נוספת על ידי SPFI. התווית מתארת קידום מערכתי, ולא חסות בתשלום.'},
 opinion: {en:'Source-based articles selected for their editorial interpretation of policy, evidence and practice. Original article formats and sources are retained.',he:'כתבות מבוססות מקורות שנבחרו בשל הפרשנות המערכתית שלהן למדיניות, לראיות ולעשייה. סוגי הכתבות והמקורות המקוריים נשמרים.'}
};
