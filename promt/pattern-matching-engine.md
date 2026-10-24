**Task:** הרצת `/bmad-build` על סיפור 1.1 ("מנוע התאמת דפוסים") מתוך `_bmad-output/planning-artifacts/epics.md`, בענף `feat/pattern-matching-engine`.

**סיכום:**
1. נוסף `src/lib/utils/pattern.ts` עם `compilePattern(raw)` ו-`matchesPattern(compiled, entry)`: התאמת "מכיל", `*` ו-`?`, ללא רגישות לרישיות, וסיומת רק בצורה `*.xxx` או `שם*.xxx`.
2. נוספו בדיקות ב-`pattern.test.ts`; `nameSearch.ts` הישן לא שונה.
