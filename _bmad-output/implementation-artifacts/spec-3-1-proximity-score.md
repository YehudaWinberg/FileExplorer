---
title: 'חישוב אחוז קרבה'
type: 'feature'
created: '2026-10-25'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** לכל תוצאה יש `score` זמני 0, ולכן אי אפשר לדרג אותן לפי קרבה (Story 3.1, FR15, FR17, AD-4).

**Approach:** `scoreMatch(compiled, entry, depth)` יחידה ב-`pattern.ts` (הנוסחה חיה רק שם); `scanTree` קורא לה במקום `matchesPattern` ושומר את הציון ב-`SearchResult`.

</frozen-after-approval>

## Implementation Notes

- החלטה שלי: "השם המכוסה" הוא שם הקובץ בלי הסיומת כשהדפוס (בלי סיומת) מתאים לו; אחרת השם המלא. כך `report` מול `report.pdf` הוא 100%, ו-`report.pdf` מול `tempReport.pdf` הוא 10/14.
- עיגול ב-`Math.round` על הציון הסופי, ו-`Math.min(score, 95)` מבטיח שלעולם לא 100.
- אין עדיין שימוש בציון בממשק (טבעת ב-3.2, מיון ב-3.3).
- סקירה עצמאית (Blind Hunter) לא הורצה; הכיסוי הוא בדיקות יחידה לדוגמאות ה-PRD ובדיקת `scanTree`.
