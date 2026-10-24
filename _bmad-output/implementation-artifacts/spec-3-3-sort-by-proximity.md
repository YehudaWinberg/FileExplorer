---
title: 'מיון לפי קרבה'
type: 'feature'
created: '2026-10-25'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** התוצאות מוצגות בסדר ההגעה בלבד, ואין דרך לראות קודם את הקרובות ביותר בלי שהרשימה תקפוץ בזמן קריאה (Story 3.3, FR16, AD-10).

**Approach:** כפתור "מיון לפי קרבה" מעל התוצאות, שמדליק `sortedByScore`; המיון הוא תצוגה נגזרת (ציון יורד, יציב, הרדוד קודם בשוויון) ואינו זמין בזמן סריקה.

</frozen-after-approval>

## Implementation Notes

- המיון נעשה ב-`orderResults` ונצרך דרך `useVisibleEntries`, ולכן גם `StatusBar` וסדר הבחירה (shift) עוקבים אחריו.
- החלטות שלי: הלחיצה מדליקה בלבד (אין כיבוי); הכפתור מושבת גם בסשן ריק (לפי ההנחה ב-UX-DR7); `resume` מאפס את הדגל.
- התוצאות שמגיעות בהשהיה אחרי מיון נכנסות למקומן הממוין (תצוגה נגזרת).
- סקירה עצמאית (Blind Hunter) לא הורצה; הכיסוי הוא בדיקות reducer, provider ורכיב.
