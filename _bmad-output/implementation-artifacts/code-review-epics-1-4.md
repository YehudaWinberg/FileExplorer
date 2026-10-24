# סקירת קוד: Epics 1 עד 4 (2026-10-25)

**היקף:** קוד ייצור בלבד (`src/**/*.ts(x)` בלי בדיקות, CSS ומסמכים), ענף `feat/return-to-results` מול `main`: 22 קבצים, כ-1,680 שורות.
**ספק:** `_bmad-output/planning-artifacts/epics.md` (כל ה-AC), מצב `full`.
**שכבות:** Blind Hunter, Edge Case Hunter, Verification Gap, Acceptance Auditor. כולן הושלמו.

**סיכום:** 1 `decision-needed` (נפתר), 3 `patch` (תוקנו בענף `fix/review-patches`), 6 `defer`, 20 נדחו.

## Review Findings

### Decision (נפתר)

- [x] [Review][Decision] `?` מתאים גם לשני תווים: ההתאמה "מכיל" (FR1) גורמת לדפוס `?` להתאים לכל שם לא ריק, בניגוד ל-AC של 1.1. [`src/lib/utils/pattern.ts`] — **הוחלט להשאיר** (התנהגות "מכיל"), חריגה מודעת מה-AC. הבדיקה ב-`pattern.test.ts` מוכיחה "תו בודד" רק על regex מעוגן.

### Patch (תוקנו)

- [x] [Review][Patch] האנימציה של שורה חדשה משוחזרת על כל השורות הקיימות בהמשך (`paused` → `scanning`), כי `isNew` נגזר מהסטטוס. תיקון: לקבע את `isNew` ברגע ה-mount של השורה. [`src/components/SearchResults.tsx`]
- [x] [Review][Patch] התחלת חיפוש ממתינה (debounce) אינה מבוטלת בחזרה/קדימה: הטיימר יורה ומחפש את הדפוס הישן בתיקייה שאליה עברו. תיקון: לבטל `schedule` בכל שינוי מיקום. [`src/state/SearchContext.tsx`]
- [x] [Review][Patch] חסרה בדיקה לסינון סוג ב-`FileList` וב-`StatusBar` במצב תיקייה רגילה (אחרי הסרת סינון השם), וה-`actions` של החיפוש נוצר מחדש בכל תוצאה ולכן אפקט `SearchBox` רץ בכל תוצאה. [`src/state/selectors.ts`, `src/components/StatusBar.tsx`, `src/state/SearchContext.tsx`]

### Defer

- [x] [Review][Defer] שגיאת הרשאה בשורש מוצגת כ-`לא נמצאו תוצאות`; תיקיות שדולגו אינן מדווחות — deferred: תואם AD-5, דורש החלטת מוצר.
- [x] [Review][Defer] `getFile` לכל שורה בלי הגבלת מקביליות ורינדור מחדש של כל השורות — deferred: נרשם ב-1.4.
- [x] [Review][Defer] מפות ה-adapter גדלות בלי ניקוי — deferred: נרשם ב-1.2.
- [x] [Review][Defer] נגישות מקלדת לחלונית הבחירה ולשורות, Escape ו-Ctrl+F — deferred: נרשם חלקית קודם.
- [x] [Review][Defer] עץ התיקיות לא מסמן את ה-root במיקום `search` — deferred: low.
- [x] [Review][Defer] `DetailsPane` בבחירה מרובה מציג את ההודעה לבחירת תוצאה — deferred: low.

## Rejected

- תיקיית `node_modules` נסרקת כשהיא ה-root: `false`; הדילוג חל רק על ילדים בשם זה (FR11), וה-root נסרק.
- `resultById.get(entry.id)!` עלול לקרוס: `false`; `entries` נגזר מאותו `session.results` באותו רינדור.
- `select` נבלע כשהמיקום זהה: `false`; ממסך תוצאות המיקום תמיד שונה (`search` מול `folder`).
- `select` של מזהה שנעלם אחרי טעינה: `false`; המזהה `parent.id/name` זהה ב-`listNames` וב-`listEntries`.
- `baseName` עם סיומת באותיות גדולות: `false`; `entry.extension` באותיות קטנות לפי המודל.
- פס ההתקדמות לפי `count/500` מטעה: `false`; כך הוגדר ב-FR25.
- כפתור "בחירת תיקייה" כאייקון, ומחיקת סינון השם הישן: `false`; נדרשו במפורש ב-1.5 וב-AD-4.
- חיווי סריקה חסר ב-`StatusBar`: `false`; החיווי בתוך התיבה לפי UX-DR6.
- הקלדה אינה מבטלת סריקה פעילה עד שה-debounce יורה (עד 300ms): `low`, פרשנות גבולית של FR8; לא שווה תיקון.
- דפוס שונה רק ברישיות משאיר `location.pattern` ישן: `low`, קוסמטי.
- דגל `s` מיותר, backtracking עם הרבה `*`, `?` ו-`a?` באותו ציון: `low`/`false`.
- סריקה סדרתית ולא מקבילית: `low`; AD-2 מגדיר BFS סדרתי.
- `catch {}` בסריקה בולע שגיאות שאינן `FsError`: `low`; ה-adapter עוטף את כל השגיאות ב-`FsError`.
- בדיקת התוצאה הראשונה בלבד מול ביצועים בעץ אמיתי: `low`; בדיקה בזיכרון מתועדת כיעד.
