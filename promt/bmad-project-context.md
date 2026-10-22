**Task:** הרצת `/bmad-help` ואחריו `bmad-project-context` על הפרויקט הקיים (Brownfield), כדי ליצור `AGENTS.md` עם בלוק הוראות מנוהל לסוכני AI. הוראות CLAUDE.md הקיימות עוברות לבלוק, ו-`CLAUDE.md` מצטמצם ל-`@AGENTS.md` כדי לא להיות מוגבל לכלי AI יחיד.

**סיכום השיחה:**
1. `/bmad-help` – נמצא ש-BMad מותקן אך אין עדיין artifacts (אין `docs`, אין `AGENTS.md`, `_bmad-output` ריקה). הומלץ להתחיל ב-`bmad-project-context`, ולאחריו תכנון (`bmad-product-brief` ← `bmad-prd` ← `bmad-ux` ← `bmad-architecture` ← epics ← sprint planning ← `bmad-build`).
2. `bmad-project-context` (מצב adopt) – נסרק הריפו, נבנה ledger של ההוראות הקיימות, ונשאלו שאלות על פערים. תשובות המשתמש:
   - `src/lib/sources/` הייתה הנחיה חד-פעמית של משימה ואינה כלל קבוע (והתיקייה לא קיימת).
   - האפליקציה לקריאה בלבד למשתמש הקצה; `lib-operations.md` מנחה סוכן שכותב קוד, ולכן אינו סותר.
   - כל משימה נפתחת בענף חדש, והפרומט שיצר אותה נשמר ב-`promt/` (הפרויקט הוא תרגיל לימודי).
   - המשתמש עובד רק עם Claude Code, אך בחר ב-`AGENTS.md` כדי לא להיות תלוי בכלי.
   - אין מסמכים חיצוניים.

**מה בוצע:**
- נוצר `AGENTS.md` עם בלוק `bmad:context` (Policy, Where things are, Running and verifying, Conventions).
- `CLAUDE.md` הצטמצם ל-`@AGENTS.md` (שני הכללים הקודמים עברו לבלוק במלואם).
- ב-`.claude/rules/lib-operations.md` תשע שורות חוזרות על "תווים לא חוקיים" אוחדו לשורה אחת.
- לא נכנסו לבלוק: מבנה תיקיות ופקודות רגילות (כבר ב-README וב-`package.json`), הכלל "src/lib בלי React" (נאכף ב-lint), ומלכודות (לא נצפו).

**Guardrails:** אין לשנות קוד מקור, אין להוסיף ספריות, ואין למחוק הוראות קיימות בלי אישור מפורש (ledger).

**Done When:** `npm run check` עבר (14 קבצי בדיקות, 156 בדיקות). בסיום בוצע Commit, מיזוג ל-`main` ו-push.
