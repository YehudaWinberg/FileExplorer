
- source_spec: `_bmad-output/implementation-artifacts/spec-1-1-pattern-matching-engine.md`
  summary: להחליט אם סיומת מרובת חלקים (`*.tar.gz`) ודפוס ריק מקבלים טיפול מיוחד ב-`compilePattern`.
  evidence: כיום `*.tar.gz` נחשב תבנית שם ו-`''` תואם הכול; לא נדרש ב-AC של סיפור 1.1.

- source_spec: `_bmad-output/implementation-artifacts/spec-1-2-incremental-tree-scan.md`
  summary: ה-maps הפנימיים `folders` ו-`files` ב-`BrowserFileSystemAdapter` גדלים בסריקה עמוקה ולא מתנקים.
  evidence: `listNames` רושם handle לכל פריט שנסרק; בעץ של מאות אלפי קבצים זה זיכרון שלא משתחרר.
- source_spec: `_bmad-output/implementation-artifacts/spec-1-2-incremental-tree-scan.md`
  summary: ל-UI אין דרך לדעת על תיקיות שדולגו או על כשל בשורש (סיום שקט בלבד).
  evidence: `listOrSkip` מחזיר מערך ריק ל-`FsError`; סיפור 1.3 צריך להחליט אם להציג זאת.

- source_spec: `_bmad-output/implementation-artifacts/spec-1-3-search-session.md`
  summary: יציאה מ-`search` בזמן סריקה (back/forward) לא ממירה ל-`paused`; הסריקה ממשיכה ברקע.
  evidence: AD-3 דורש המרה ל-`paused`, אך אין עדיין סטטוס `paused` (סיפור 2.1).
- source_spec: `_bmad-output/implementation-artifacts/spec-1-3-search-session.md`
  summary: `searchReducer` מעתיק את מערך התוצאות בכל תוצאה ואין תקרה.
  evidence: ב-10,000 התאמות העלות ריבועית; תקרת 500 מתוכננת ב-2.3.
- source_spec: `_bmad-output/implementation-artifacts/spec-1-3-search-session.md`
  summary: ביטול debounce תלוי בניווט `user` לא ממומש כי אין עדיין debounce.
  evidence: ה-debounce נבנה בתיבת החיפוש (סיפור 1.5).

- source_spec: `_bmad-output/implementation-artifacts/spec-1-4-results-screen.md`
  summary: `getFile` נקרא לכל שורה בעת הצגתה, בלי הגבלת מקביליות ובלי טעינה לפי חלון תצוגה; כל תשובה מרנדרת מחדש את כל השורות.
  evidence: ב-500 תוצאות (תקרה מתוכננת ב-2.3) זה כ-500 קריאות במקביל; בלי תקרה זה גדל עם מספר ההתאמות.
- source_spec: `_bmad-output/implementation-artifacts/spec-1-4-results-screen.md`
  summary: ניווט מקלדת ו-ARIA תקין (grid) למסך התוצאות, והצגת קבצים לא קריאים.
  evidence: אין `tabIndex`/חצים בשורות; `unreadable` נשמר אך השורה מוצגת בלי סימון.

- source_spec: `_bmad-output/implementation-artifacts/spec-1-5-address-bar-search-box.md`
  summary: לחיצה על עצירה מעבירה את הפוקוס ל-body והתיבה מתכווצת באמצע הלחיצה; Enter אינו מתחיל חיפוש מיידי.
  evidence: הכפתור נעלם אחרי העצירה ואין `onKeyDown`; אין בדיקה לאף אחד מהם.

- source_spec: `_bmad-output/implementation-artifacts/spec-2-1-pause-resume-scan.md`
  summary: אחרי החלפת כפתור השהיה בהמשך הפוקוס אובד, ואין בדיקות StrictMode וקליקים מהירים להשהיה/המשך.
  evidence: הכפתור הממוקד נמחק מה-DOM; `sessionRef` מתעדכן באפקט אחרי רינדור.

- source_spec: `_bmad-output/implementation-artifacts/spec-4-2-choice-dialog-goto-location.md`
  summary: אחרי מעבר למיקום הפריט המסומן אינו נגלל לתצוגה ברשימה ארוכה, והחלונית ממוקמת קבוע ולא ליד השורה.
  evidence: אין scrollIntoView; `.choice` ממוקמת ב-top קבוע.
