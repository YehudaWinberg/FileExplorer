**Task:** הרצת `/bmad-build` על סיפור 1.2 ("סריקת עץ בהדרגה") מתוך `_bmad-output/planning-artifacts/epics.md`, בענף `feat/scan-tree-incremental`.

**סיכום:**
1. נוספה ל-`FileSystemAdapter` המתודה הקריאה-בלבד `listNames(folder)`: שם, סוג ומזהה בלי `getFile()` ובלי בקשת הרשאה.
2. נוסף `src/lib/scanTree.ts`: מחולל `scanTree(adapter, root, compiled, signal)` שסורק BFS ומחזיר `SearchResult = { entry, parent, depth, score }` אחד לכל `yield` (score זמני 0).
3. תיקיות ללא הרשאה או שנעלמו מדולגות בשקט, `node_modules` ו-`.git` (`SKIP_DIRS`) לא נסרקות, וביטול ה-signal או כשל בשורש מסיימים בלי שגיאה.
4. נוספו בדיקות עם adapter בזיכרון, כולל בדיקת ביצועים על כ-9,300 קבצים ב-5 רמות (יעד, לא הבטחה).
5. אין שינוי ב-UI או ב-state; `scanTree` יחובר בסיפור 1.3.
