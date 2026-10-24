**Task:** הרצת `/bmad-build` על סיפור 3.1 ("חישוב אחוז קרבה") מתוך `_bmad-output/planning-artifacts/epics.md`, בענף `feat/proximity-score`.

**סיכום:**
1. נוספה `scoreMatch(compiled, entry, depth)` ב-`pattern.ts`: `null` בלי התאמה, אחרת בסיס שם (תווים קבועים מתוך השם המכוסה, `?` קבוע, 100% בלי תווים קבועים) פחות 5 נקודות לכל רמת עומק, מעוגל, רצפה 0, מקסימום 95.
2. הסיומת לא נספרת בבסיס כשהדפוס בלי סיומת (`report` מול `report.pdf` = 100% לפני עומק).
3. `scanTree` מחשב `score` דרך `scoreMatch` במקום 0 זמני, בלי לשנות את סדר ה-BFS.
