---
title: 'חזרה למסך התוצאות'
type: 'feature'
created: '2026-10-25'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** אחרי מעבר למיקום מתוצאה צריך ש"אחורה" יחזיר לאותן תוצאות בלי סריקה חדשה (Story 4.3, FR20, AD-5, AD-6).

**Approach:** ההתנהגות כבר נבנתה בסיפורים קודמים; כאן מאמתים אותה בבדיקות אינטגרציה לתרחיש UJ-1 ולמצבי הקצה.

</frozen-after-approval>

## Implementation Notes

- לא נדרש שינוי בקוד הייצור; הסיפור נסגר בבדיקות בלבד (`FileSearch.test.tsx`).
- אחרי ניווט משתמש (למשל פתיחת תיקייה) חזרה ב-back אל מיקום החיפוש יוצרת סשן חדש לאותו דפוס (סריקה חדשה), ולא תוצאות ישנות.
- סקירה עצמאית (Blind Hunter) לא הורצה, כי לא שונה קוד ייצור.
