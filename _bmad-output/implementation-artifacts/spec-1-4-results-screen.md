---
title: 'מסך תוצאות'
type: 'feature'
created: '2026-10-25'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** יש סשן חיפוש (1.3) אבל אין מסך שמציג אותו; `StatusBar` ו-`DetailsPane` קוראים ישירות מתוכן התיקייה (Story 1.4, FR7, FR14, FR23, AD-7).

**Approach:** `SearchResults` נפרד מ-`FileList` מציג את תוצאות הסשן בשלוש עמודות; גודל ותאריך נטענים רק לשורות שמוצגות; `useVisibleEntries()` ו-`useSelectedEntry()` הם המקור היחיד ל-`StatusBar` ול-`DetailsPane`.

</frozen-after-approval>

## Implementation Notes

- `useSearchOptional` מאפשר ל-`StatusBar`/`DetailsPane`/`FileInfo` לעבוד גם בלי `SearchProvider` (הבדיקות הקיימות).
- ב-`FileInfo` נתיב הקובץ במיקום `search` נגזר מה-`parent` של התוצאה.
- אין עדיין חיווי סריקה או הפסקה (1.5/2.x); מסך הסריקה בלי תוצאות מציג רק כותרת.
- הטוקנים החדשים של UX-DR1 יתווספו ב-1.5; כאן משתמשים בטוקנים הקיימים.

## Review Triage Log

- תשובת `getFile` מריצה ישנה דורסת פרטים של הריצה הנוכחית: medium, אומת; תוקן (נזרקת אם `runId` השתנה).
- כלל `prefers-reduced-motion` לא גבר על האנימציה (ספציפיות): low-medium; תוקן.
- `getFile` לכל שורה שמוצגת, בלי חלון תצוגה או הגבלת מקביליות: medium; נדחה (תקרת 500 ב-2.3).
- עדכון כל השורות בכל תשובת פרטים (O(n)): medium; נדחה יחד עם הקודם.
- אין חיווי לסריקה ריקה/מופסקת/שגיאה, קבצים לא קריאים מוצגים ריקים, נגישות מקלדת, `1 פריטים נבחרו`, ARIA grid: low/מחוץ לטווח; לא טופלו.
