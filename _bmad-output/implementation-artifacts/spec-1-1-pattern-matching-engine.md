---
title: 'מנוע התאמת דפוסים'
type: 'feature'
created: '2026-10-25'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** החיפוש הקיים (`nameSearch.ts`) מתאים רק "מכיל" פשוט לפי שם; אין תמיכה ב-`*`, `?` או בסיומת (Story 1.1, FR1–FR5).

**Approach:** מודול טהור חדש `src/lib/utils/pattern.ts` עם `compilePattern(raw)` → `{ nameRe, extension|null, fixedChars }` ופונקציית התאמה `matchesPattern(compiled, entry)`, עם בדיקות `pattern.test.ts`. `nameSearch.ts` נשאר ללא שינוי; `scoreMatch` מחוץ לטווח (Epic 3).

</frozen-after-approval>

## Implementation Notes

- ה-regex אינו מעוגן: התאמת "מכיל". `*` → `.*`, `?` → `.`, כל תו אחר בריחה; דגל `i` (+`s`).
- סיומת רק בצורה `*.xxx` / `שם*.xxx` (הדפוס מסתיים ב-`.xxx` ללא `*`/`?`/`.` בסיומת, ולפניה `*`); `.pdf` לבדו וכן `report.pdf` הם תבנית שם.
- כשיש סיומת: רק קבצים, והשוואת `entry.extension` מדויקת; `nameRe` חל על השם ללא הסיומת.
- נוספו `pattern.ts` ו-`pattern.test.ts`; `nameSearch.ts` לא שונה.
- נוסף דגל `u` (כדי ש-`?` יתאים לתו שלם), צמצום `**` ל-`*` והסרת בריחה מיותרת של `-` ו-`/`.

## Review Triage Log

- דגל `u` חסר: medium, אומת (`?` מול אימוג'י); תוקן.
- `**` חוזר ללא צמצום (backtracking): medium; תוקן.
- בדיקת `?` מעוגנת נבנתה מחדש מ-`nameRe.source`: low; נשארה, כי התאמה מעוגנת אינה חלק מ-API.
- `*.tar.gz` ללא סיומת, ריק/רווחים, `baseName` ללא התאמה, נרמול עברית, `fixedChars` ללא צרכן: low/מחוץ לטווח; נדחו (נרשמו ב-deferred-work).
