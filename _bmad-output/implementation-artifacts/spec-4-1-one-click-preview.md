---
title: 'תצוגה מקדימה בלחיצה אחת'
type: 'feature'
created: '2026-10-25'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** במסך התוצאות חלונית הפרטים ריקה לתיקיות, ואובייקט הפריט הנבחר משתנה בכל תוצאה חדשה ולכן התצוגה המקדימה נטענת מחדש (Story 4.1, FR26, AD-7).

**Approach:** פרטי תיקייה בלי תצוגה מקדימה, רקע `details-bg` למסך התוצאות, ו-`useSelectedEntry` עם זהות יציבה.

</frozen-after-approval>

## Implementation Notes

- רוב הסיפור כבר היה קיים מ-1.4 (בחירה בלחיצה, `DetailsPane` דרך `useSelectedEntry`, placeholder, `FileInfo` עם `getFile` לקריאה בלבד); נוספו פרטי תיקייה, הרקע והיציבות.
- ללא חלונית בחירה בלחיצה כפולה (סיפור 4.2).
- סקירה עצמאית (Blind Hunter) לא הורצה; הכיסוי הוא בדיקות רכיב.
