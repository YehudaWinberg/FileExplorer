---
title: 'יציאה מחיפוש ואי-שבירה'
type: 'feature'
created: '2026-10-25'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** ממסך תוצאות אי אפשר לחזור לגלישה רגילה בניקוי התיבה, "למעלה" ורענון לא מטופלים, ונשאר קוד חיפוש ישן (Story 1.6, FR21, FR22, NFR6).

**Approach:** ניקוי התיבה מנווט (`user`) ל-root של החיפוש; `up` ו-`refresh` מטפלים ב-`search`; בדיקות לניווט בזמן סריקה, ל-FR22 ולקריאה בלבד; מחיקת `nameSearch.ts` ובדיקתו.

</frozen-after-approval>

## Implementation Notes

- רענון במיקום `search` מנקה את הסשן (ניווט `user`) והאפקט היחיד מתחיל סריקה חדשה; הבדיקה סופרת קריאות `listNames` לשורש.
- `readOnly.test.ts` סורקת את `src/` ללא קבצי בדיקה אחר API של כתיבה לדיסק וקריאות רשת.
- אזכורי `nameSearch` שנותרו הם במסמכי תכנון ובפרומטים היסטוריים בלבד.
- Epic 1 הושלם; נשארו לו פריטים ב-`deferred-work.md`.

## Review Triage Log

- "רענון לא מוכח": medium; אומת בבדיקה שסופרת סריקות (נוספה).
- הטיוטה לא מתאפסת ביציאה: false; האפקט ב-`SearchBox` מאפס אותה כשהמיקום אינו `search`.
- ניקוי בזמן סריקה לפני מסך תוצאות: false; `start` מנווט ל-`search` מיד.
- בחירת תיקייה מבטלת רק אחרי שהדיאלוג נסגר, כפתור בחירה בביטול: low; מכוון.
- `readOnly.test.ts` חלשה (דפוסים חסרים, אין בדיקה עצמית), ניקוי התיבה מוסיף רשומת היסטוריה זהה ל-root: low; לא טופלו.
