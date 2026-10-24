---
title: 'חלונית בחירה ומעבר למיקום'
type: 'feature'
created: '2026-10-25'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** אי אפשר להגיע מתוצאה לתיקיית הקובץ בהקשר שלו (Story 4.2, FR18, FR19, AD-6, AD-7).

**Approach:** לחיצה כפולה פותחת חלונית בחירה מינימלית; "מעבר למיקום" מנווט לתיקיית הפריט עם `origin: 'result'` ו-`select: id`, בלי לנקות את הסשן.

</frozen-after-approval>

## Implementation Notes

- החלונית מקומית ל-`SearchResults` (מצב `choiceId`); נסגרת ב-Esc ובלחיצה מחוץ.
- בתיקייה שנבחרה "מעבר למיקום" מציג את תיקיית האב שלה ומסמן אותה.
- עץ התיקיות מתעדכן דרך האפקט הקיים ב-`ExplorerContext` (פתיחת אבות).
- בדיקת ממשק מוכיחה גם ש"אחורה" מחזיר לאותן תוצאות (שייך ל-4.3, יחוזק שם).
- גלילה אל הפריט המסומן ברשימה לא נעשתה.
- סקירה עצמאית (Blind Hunter) לא הורצה; הכיסוי הוא בדיקות רכיב, provider ו-reducer.
