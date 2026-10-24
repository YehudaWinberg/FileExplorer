---
title: 'תיבת חיפוש בשורת הכתובת'
type: 'feature'
created: '2026-10-25'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** אין דרך למשתמש להפעיל את החיפוש החדש; התיבה הקיימת מסננת רק את התיקייה הנוכחית (Story 1.5, FR8, FR9, FR13).

**Approach:** `SearchBox` משותפת בשורה העליונה, עם debounce של 300ms דרך `search.schedule`, חיווי סריקה ועצירה בתוכה, והסרת הסינון הישן (`searchQuery`, פעולת `search`, התיבה ב-`FileList`).

</frozen-after-approval>

## Implementation Notes

- ה-debounce חי ב-`SearchProvider` כדי שניווט `user` יבטל אותו באותו אירוע; התיבה מסנכרנת את הטיוטה מהמיקום רק כשאין התחלה ממתינה (`isScheduled`).
- `Breadcrumbs` מציג במיקום `search` את שרשרת ה-root, ובפוקוס `… › שם`.
- נמחקה בדיקת LineCount "does not re-read files when searching" (תלויה בסינון שהוסר בכוונה).
- ניקוי התיבה לחזרה ל-root, Esc, ו-`nameSearch.ts` נשארים לסיפור 1.6.
- לא נבדק בדפדפן אמיתי (בחירת תיקייה דורשת דיאלוג מערכת); נבדק בבדיקות רכיב.

## Review Triage Log

- הטיוטה נדרסת כשהמשתמש ממשיך להקליד אחרי תחילת החיפוש: medium, אומת; תוקן (`isScheduled`) ונוספה בדיקה.
- תלות חסרה ב-`stop` (`cancelScheduled`): low; תוקן.
- ניקוי תיבה/Esc/Enter לא מטופלים: ניקוי הוא 1.6; Enter ו-Esc low, נדחו.
- פוקוס נעלם אחרי לחיצה על עצירה והתיבה מתכווצת בלחיצה: low-medium; נדחה.
- טוקנים בלי ערכי dark ו-טוקנים שעדיין לא בשימוש: מכוון לפי ה-AC (מצב בהיר בלבד, שימוש ב-2.x עד 4.x).
- "נמצאו 1 תוצאות", הכרזה זהה לא חוזרת, בדיקות Enter/pc/quick: low; לא טופלו.
