---
title: 'השהיה והמשך של סריקה'
type: 'feature'
created: '2026-10-25'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** אפשר רק לעצור סריקה סופית; אי אפשר להשהות כדי לבדוק תוצאה ולהמשיך מאותה נקודה (Story 2.1, FR24, AD-3).

**Approach:** סטטוס `paused` ב-reducer; לולאת הסריקה לא קוראת ל-`next()` בהשהיה וממשיכה באותו מחולל בהמשך; יציאה מ-`search` ב-back/forward משהה; כפתורי השהיה/המשך/עצירה וטקסט `מושהה — נמצאו N` בתיבה.

</frozen-after-approval>

## Implementation Notes

- ההשהיה היא "לא לקרוא ל-`next()`": `next()` שכבר בדרך מסתיים והתוצאה נשמרת; השער `resumeGateRef` משחרר את הלולאה בהמשך או בעצירה.
- חזרה קדימה לחיפוש מושהה משאירה אותו מושהה; ההמשך ידני.
- פס ההתקדמות (2.2) ותקרת 500 (2.3) עדיין לא קיימים.

## Review Triage Log

- `pausedRef` תקוע על true אחרי סיום טבעי: low-medium; תוקן (מתאפס ב-finally).
- `sessionRef` מתעדכן באפקט ולכן קליקים מהירים מאוד עלולים להידלף: low; לא טופל.
- המשך אחרי ביטול ב-unmount עלול לסרוק מחדש: low, לא ניתן להגעה בזרימה רגילה; לא טופל.
- פוקוס אובד כשכפתור ההשהיה מוחלף בהמשך, ניגודיות משולש ההמשך על רקע כתום, הכרזה בלי מספר: low; נדחו.
