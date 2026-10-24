**Task:** תיקון K5 מהרטרוספקטיבה של Epic 4 (`_bmad-output/implementation-artifacts/epic-4-retro-2026-10-25.md`), בענף `fix/scroll-to-selected-after-goto`: אחרי "מעבר למיקום" מתוצאת חיפוש, הקובץ המסומן נגלל לתצוגה ברשימת התיקייה.

**סיכום:**
1. `Row` ב-`FileList.tsx` שנטענת כשהיא כבר נבחרת קוראת ל-`scrollIntoView({ block: 'nearest' })` פעם אחת בטעינה; לחיצה רגילה על שורה קיימת אינה מגללת.
2. `scroll-margin-top: 32px` ב-`app.css` כדי שהשורה לא תוסתר מתחת לכותרת הדביקה.
3. נבדק: בדיקה חדשה ב-`FileSearch.test.tsx` (נכשלת בלי התיקון ועוברת איתו), ו-`npm run check` ירוק (270 בדיקות).
