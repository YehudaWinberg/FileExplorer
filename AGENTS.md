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


## Conventions that differ from defaults

- לדבר עם המשתמש תמיד בעברית; באנגלית רק שמות קבצים, פונקציות ומונחים טכניים.

<!-- /bmad:context -->

## כללי עבודה קבועים (בבעלות המשתמש)

### Git — רק באישור מפורש

- לעולם אין לבצע `commit`, `push` או פתיחת Pull Request בלי בקשה מפורשת של המשתמש באותה משימה. אישור קודם לא מועבר למשימה אחרת.
- זה חל גם כשזרימת עבודה או skill (למשל `bmad-build`) כוללת שלב commit: מדלגים עליו ומשאירים את השינויים בעץ העבודה.
