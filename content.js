const bi=(en,he)=>({en,he});
export const sources={
 migal:{name:'MIGAL · Agrivoltaics Center',url:'https://www.migal.org.il/en/agrivoltaics-center'},
 etgar:{name:'Hebrew University · Lioz Etgar Lab',url:'https://lioz-etgar.huji.ac.il/'},
 edri:{name:'Ben-Gurion University · Eran Edri',url:'https://www.bgu.ac.il/en/researcher/eran-edri/'},
 innovation:{name:'Israel Innovation Authority · Climate Tech',url:'https://innovationisrael.org.il/document/israels-state-of-climate-tech-2024-5/'},
 kkl:{name:'KKL-JNF · Sun for Everyone (2023)',url:'https://www.kkl-jnf.org/about-kkl-jnf/green-israel-news/green-israel-news-2023/solar-energy.aspx'},
 nature:{name:'Nature Israel · Initiatives & Programs',url:'https://natureisrael.org/initiativesprograms/'},
 environment:{name:'US EIA · Solar energy and the environment',url:'https://www.eia.gov/energyexplained/solar/solar-energy-and-the-environment.php'},
 doral:{name:'Doral · Agrivoltaic projects (company source)',url:'https://doral-energy.com/en/projects_cat/general-agro-en/'},
 selective:{name:'Hebrew University · Selective solar cells',url:'https://en.huji.ac.il/news/new-development-selective-solar-energy-cells-produce-green-electricity-while'},
 solar:{name:'US Department of Energy · Solar photovoltaic technology',url:'https://www.energy.gov/eere/solar/solar-photovoltaic-technology-basics'},
 potential:{name:'Ministry of Energy · GovMap solar potential',url:'https://www.govmap.gov.il/sites/energy/energy.html'}
};
export const actors=[
 {name:bi('MIGAL · Agrivoltaics Center','מיגל · מרכז אגרו־וולטאיקה'),role:bi('RESEARCH × FARMING','מחקר × חקלאות'),text:bi('Eric Benmeir Kozakow leads a center connecting crop research, growers and solar engineering.','אריק בן־מאיר קוזקוב מוביל מרכז המחבר בין מחקר גידולים, מגדלים והנדסה סולארית.'),source:'migal'},
 {name:bi('Lioz Etgar Lab','מעבדת ליוז אתגר'),role:bi('PEOPLE × MATERIALS','אנשים × חומרים'),text:bi('A Hebrew University research group working on new solar-cell materials and structures.','קבוצת מחקר באוניברסיטה העברית העוסקת בחומרים ובמבנים חדשים לתאים סולאריים.'),source:'etgar'},
 {name:bi('Eran Edri Lab','מעבדת ערן אדרי'),role:bi('PEOPLE × DISCOVERY','אנשים × גילוי'),text:bi('Ben-Gurion University researchers studying ways to harness sunlight with new materials.','חוקרים באוניברסיטת בן־גוריון הבוחנים דרכים לניצול אור השמש באמצעות חומרים חדשים.'),source:'edri'},
 {name:bi('Doral & farming partners','דוראל ושותפים חקלאיים'),role:bi('COMPANIES × GROWERS','חברות × מגדלים'),text:bi('The developer’s agrivoltaic portfolio offers a company perspective on dual-use land.','תיק הפרויקטים האגרו־וולטאיים של היזם מציג נקודת מבט עסקית על שימוש כפול בקרקע.'),source:'doral'},
 {name:bi('Israel Innovation Authority','רשות החדשנות'),role:bi('STARTUPS × FUNDING','חברות הזנק × מימון'),text:bi('Public research and development support and reporting on Israel’s climate-tech ecosystem.','תמיכה ציבורית במחקר ופיתוח ודיווח על ענף האקלים־טק בישראל.'),source:'innovation'},
 {name:bi('Sun for Everyone partners','שותפי שמש לכולם'),role:bi('COMMUNITIES × PHILANTHROPY','קהילות × פילנתרופיה'),text:bi('An initiative linking residents, the Israeli Energy Forum, KKL-JNF, government and philanthropy.','מיזם המחבר בין דיירים, הפורום הישראלי לאנרגיה, קק״ל, הממשלה ופילנתרופיה.'),source:'kkl'}
];
export const channels=[
 {id:'agriPV',name:'AgriPV',text:bi('Agriculture & photovoltaics','חקלאות ופוטו־וולטאיקה')},
 {id:'Solarnews',name:'Solarnews',text:bi('Solar industry updates','עדכונים מהענף הסולארי')},
 {id:'Energeticum',name:'Energeticum',text:bi('Energy perspectives','נקודות מבט על אנרגיה')},
 {id:'RenEnRus',name:'RenEnRus',text:bi('Renewable energy','אנרגיה מתחדשת')},
 {id:'energopolee',name:'Энергополе',text:bi('Broader energy context','הקשר רחב של משק האנרגיה')}
];
export const faqs=[
 [bi('How does a solar panel make electricity?','איך פאנל סולארי מייצר חשמל?'),bi('Photovoltaic cells convert incoming light into electrical energy. An inverter converts the panel’s direct current into alternating current for compatible electrical systems. Solar water heating is a different use of the sun.','תאים פוטו־וולטאיים ממירים אור לאנרגיה חשמלית. ממיר הופך את הזרם הישר של הפאנל לזרם חילופין המתאים למערכות החשמל. חימום מים בשמש הוא שימוש אחר באנרגיית השמש.'),'solar'],
 [bi('What makes agrivoltaics different?','מה מיוחד באגרו־וולטאיקה?'),bi('Agrivoltaics combines agricultural activity with solar electricity on the same land. Panel layout, crop needs, access for machinery and the division of responsibilities all matter. Crop yield or water savings should be demonstrated for the actual site and crop.','אגרו־וולטאיקה משלבת פעילות חקלאית וייצור חשמל סולארי באותה קרקע. סידור הפאנלים, צורכי הגידול, גישה למיכון וחלוקת האחריות חשובים כולם. יש להוכיח יבול או חיסכון במים עבור האתר והגידול המסוימים.'),'migal'],
 [bi('Does a map marker mean a project is operating?','האם סימון במפה אומר שהפרויקט פועל?'),bi('No. A planning record, a potential site and a reviewed project describe different things. AGRIPV keeps them separate. Planning approval alone does not prove construction, grid connection or electricity production.','לא. רשומת תכנון, אתר פוטנציאלי ופרויקט שנבדק מתארים דברים שונים. AGRIPV מפריד ביניהם. אישור תוכנית לבדו אינו מוכיח הקמה, חיבור לרשת או ייצור חשמל.'),null],
 [bi('Where can I begin evaluating a roof?','איפה מתחילים לבדוק גג?'),bi('Israel’s Ministry of Energy provides a solar-potential map. Treat modeled potential as a starting point. An actual project still requires site-specific checks of the structure, shading, connection and operating arrangements.','משרד האנרגיה מציע מפה של פוטנציאל סולארי. פוטנציאל מחושב הוא נקודת מוצא. פרויקט בפועל עדיין דורש בדיקות פרטניות של המבנה, ההצללה, החיבור והסדרי התפעול.'),'potential']
];
