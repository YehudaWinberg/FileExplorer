# דוח היתכנות: rtl-hebrew

## שורת הקלט

ממצא מהטיפוסים (`claude-code.d.ts`): `ui.render` לא מצייר את תיבת הקלט, ול-hooks של הקלט (`prompt.edit`, `prompt.change`, `prompt.fill`, `prompt.read`) אין `dir`. לכן אין דרך מתועדת להפוך את כיוון הקריאה של תיבת הקלט עצמה.

הפתרון שמומש: שורת מראה ב-`AbovePrompt` (hook על `prompt.change` שומר את הטיוטה ב-state, והשורה מצוירת ב-`Text dir="rtl"` רק כשיש בטיוטה עברית). הקלט עצמו לא משתנה, ולא מוסיפים תווי RLM/RLE לטיוטה או לפרומפט. הפער הפתוח: התיבה עצמה נשארת כפי שהיא.

## מצבי הרצה

| מצב | סטטוס |
|-----|-------|
| שיחה רגילה (`claude --plugin-dir`) | הלוגיקה נבדקה אוטומטית (`claude plugin test`, משטח `terminal`); הציור ב-Windows Terminal לא נבדק, בדיקה ידנית |
| `claude -p` | לא נבדק, בדיקה ידנית (אין transcript מצויר) |
| resume | לא נבדק, בדיקה ידנית |
| subagents | לא נבדק, בדיקה ידנית |
| `claude agents` | לא נבדק, בדיקה ידנית (לא ידוע אם טוען plugins) |
