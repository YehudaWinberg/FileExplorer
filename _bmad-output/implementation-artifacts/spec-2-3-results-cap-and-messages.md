---
title: 'תקרת 500 והודעת הפסקה'
type: 'feature'
created: '2026-10-25'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** סריקה יכולה להחזיר אלפי תוצאות, ואין הודעה למשתמש כשהסריקה הופסקה או נחתכה (Story 2.3, FR12, FR23, AD-8).

**Approach:** הצרכן ב-`SearchProvider` עוצר את המחולל ב-500 ומסמן `capped`; מסך התוצאות מציג הודעת תקרה והודעת הפסקה; `לא נמצאו תוצאות` נשארת ל-`done` בלבד.

</frozen-after-approval>

## Implementation Notes

- התקרה נאכפת רק בצרכן; `scanTree.test.ts` מוכיח שהמחולל מחזיר 650 תוצאות. ה-reducer מוסיף הגנה כפולה (לא שומר מעל `RESULT_CAP`).
- בתקרה בדיוק של 500 תוצאות ושהעץ נגמר, הסטטוס `capped` (ייתכן שיש עוד).
- ההודעה מוצגת פעמיים במכוון: פס מעל הטבלה וכהכרזה ב-live region של התיבה.
- סקירה עצמאית (Blind Hunter) לא הורצה; הכיסוי הוא בדיקות reducer, provider ורכיב.
