export const sectionPages = {
 agripv:{slug:'agrivoltaics',en:'Agrivoltaics',he:'אגרו־וולטאיקה',intro:{en:'Solar in working landscapes: crops, farm operations and shared land use.',he:'אנרגיה סולארית בשטחים חקלאיים: גידולים, עבודת המשק ושימוש משותף בקרקע.'}},
 research:{slug:'research-technology',en:'Research & technology',he:'מחקר וטכנולוגיה',intro:{en:'Research, materials and new approaches—with a closer look at what the evidence supports.',he:'מחקר, חומרים וגישות חדשות — עם מבט מקרוב על מה שהראיות תומכות בו.'}},
 industry:{slug:'industry-policy',en:'Industry & policy',he:'תעשייה ומדיניות',intro:{en:'The organisations, public decisions and practical steps shaping solar deployment.',he:'הארגונים, ההחלטות הציבוריות והצעדים המעשיים שמעצבים את יישום האנרגיה הסולארית.'}},
 people:{slug:'people-communities',en:'People & communities',he:'אנשים וקהילות',intro:{en:'The people, agreements and everyday work behind shared solar projects.',he:'האנשים, ההסכמות ועבודת היומיום שמאחורי פרויקטים סולאריים משותפים.'}},
 environment:{slug:'environment',en:'Environment',he:'סביבה',intro:{en:'Solar alongside water, biodiversity and changing landscapes.',he:'אנרגיה סולארית לצד מים, מגוון ביולוגי ונופים משתנים.'}},
 storage:{slug:'storage-grids',en:'Storage & grids',he:'אגירה ורשתות',intro:{en:'How energy is stored, delivered and integrated into electricity networks.',he:'כיצד אנרגיה נאגרת, מועברת ומשתלבת ברשתות החשמל.'}}
};
export const sectionHref=(topic,lang='en')=>`./${sectionPages[topic]?.slug||'index'}.html?lang=${lang}`;
