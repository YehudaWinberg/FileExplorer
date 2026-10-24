**Task:** הרצת `/bmad-build` על סיפור 1.3 ("מצב חיפוש, סשן והפעלה") מתוך `_bmad-output/planning-artifacts/epics.md`, בענף `feat/search-session-state`.

**סיכום:**
1. `Location` הורחב ב-`{ type: 'search', root, pattern }`, ו-`sameLocation` משווה `root.id` ודפוס מנורמל.
2. נוסף `searchReducer` (`SearchSession` עם `runId`, פעולות `start`/`result`/`finished`/`stop`/`clear`; פעולה עם `runId` ישן מתעלמת).
3. נוסף `SearchProvider` עם `search.start(pattern)` ו-`search.stop()` ואפקט יחיד שמפעיל `scanTree`, מוגן מהפעלה כפולה ב-StrictMode.
4. `ExplorerContext` קיבל שער ניווט `goTo(location, { origin, replace })`: `origin: 'user'` מנקה סשן ומבטל ריצה, `'result'` ו-back/forward לא.
5. אין ממשק חיפוש חדש עדיין (מסך תוצאות בסיפור 1.4, תיבת חיפוש ב-1.5).
