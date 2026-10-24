---
title: 'פס התקדמות'
type: 'feature'
created: '2026-10-25'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** אין חיווי חזותי להתקדמות הסריקה או למצבה (Story 2.2, FR25, UX-DR6).

**Approach:** פס 3px בתחתית תיבת החיפוש, עיטור בלבד, ברוחב `count / 500`: כחול בסריקה, כתום קפוא בהשהיה, 100% כחול בסיום, ברוחב העצירה בעצירה ידנית, ובלי פס במנוחה.

</frozen-after-approval>

## Implementation Notes

- `RESULT_CAP = 500` ב-`searchReducer.ts`; האכיפה עצמה (סטטוס `capped`) ב-2.3. עד אז `count >= 500` נותן 100%.
- סקירה עצמאית (Blind Hunter) לא הורצה בסיפור הקטן הזה; הכיסוי הוא בדיקות הרכיב ו-`npm run check`.
