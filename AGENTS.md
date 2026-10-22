<!-- bmad:context -->
<!-- Verified 2026-10-23 against 6a33f4d. Managed by bmad-project-context; edits inside this block are replaced on refresh. Keep anything you want preserved outside the markers. -->

## FileExplorer

סייר קבצים בסגנון Windows 11, אפליקציית Web בעברית (RTL) עם React 19, TypeScript, Vite, Vitest ו-oxlint. הפרויקט הוא תרגיל לימודי: כל משימה נולדת מפרומט שנשמר ב-`promt/`.

## Policy

- האפליקציה לקריאה בלבד: אין כתיבה, מחיקה או שינוי שם בדיסק, אין Backend ואין קריאות רשת.
- כל משימה על ענף חדש משלה; לא עובדים על `main`.

## Where things are

- `promt/` — הפרומטים שיצרו כל משימה. פרומט של משימה חדשה נשמר שם.
- `.claude/rules/` — כללים נוספים; `lib-operations.md` נטען בעבודה על `src/lib/**`.

## Running and verifying

- אחרי כל שינוי בקבצים: `npm run check` (typecheck + lint + tests). אם נכשל, לתקן ולהריץ שוב. אם אי אפשר, לדווח בכנות על הכשל. אין צורך להריץ כשלא שונו קבצים.
- `npm run dev` פותח גם דפדפן במסך מלא (`scripts/open-fullscreen.mjs`). להרצת שרת Vite בלבד: `npm run web`.
- Node 20 ומעלה; בדיקה ידנית רק ב-Chrome או Edge (File System Access API).

## Conventions that differ from defaults

- לדבר עם המשתמש תמיד בעברית; באנגלית רק שמות קבצים, פונקציות ומונחים טכניים.

<!-- /bmad:context -->
