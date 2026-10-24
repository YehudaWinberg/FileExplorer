---
title: 'טבעת קרבה בשורת תוצאה'
type: 'feature'
created: '2026-10-25'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** לציון הקרבה (3.1) אין ביטוי בממשק; המשתמש לא רואה כמה כל תוצאה קרובה למה שחיפש (Story 3.2, FR15, UX-DR9, UX-DR15).

**Approach:** רכיב `ProximityRing` סביב אייקון התוצאה: קשת מלמעלה לפי האחוז, תג מספר, ו-tooltip ו-`aria-label` בעברית, בלי להזיז שורות.

</frozen-after-approval>

## Implementation Notes

- הטבעת 38px בתוך שורה של 52px; התג תלוי 5px מתחת לטבעת ואינו משנה את גובה השורה.
- ערך מחוץ ל-0..100 נחתך ומעוגל; הציון עצמו כבר מגיע בטווח 0..95.
- המיון (3.3) עדיין לא קיים, והסדר נשאר סדר ההגעה.
- סקירה עצמאית (Blind Hunter) לא הורצה; הכיסוי הוא בדיקות רכיב. העיצוב החזותי (התג מחוץ לטבעת) לא נבדק בדפדפן אמיתי.
