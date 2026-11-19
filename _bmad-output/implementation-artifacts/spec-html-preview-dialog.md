---
title: 'דיאלוג תצוגה מקדימה לקובץ HTML'
type: 'feature'
created: '2026-11-20'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** לחיצה כפולה על קובץ HTML ברשימת הקבצים אינה עושה דבר, ואי אפשר לראות את הדף בלי לצאת מהאפליקציה.

**Approach:** לחיצה כפולה על קובץ `.html`/`.htm` ברשימת הקבצים פותחת דיאלוג מודאלי שמציג את הדף (קריאה בלבד, `iframe` ב-sandbox), בגודל 80% מרוחב וגובה המסך, עם כפתור X בפינה הימנית העליונה לסגירה. ממומש על הענף הנוכחי `feat/level-6`.

</frozen-after-approval>

## Implementation Notes

- רכיב חדש `src/components/HtmlPreviewDialog.tsx`: טוען את הקובץ דרך `adapter.getFile` ל-Blob URL (בלי רשת, בלי כתיבה), `iframe` עם `sandbox=""` (בלי סקריפטים), סגירה ב-X וב-Escape ובלחיצה על הרקע.
- `FileList.tsx`: `onOpen` של שורת קובץ HTML פותח את הדיאלוג; תיקייה ממשיכה להיפתח כרגיל; קבצים אחרים ללא שינוי.
- מסך תוצאות החיפוש לא שונה: לחיצה כפולה שם ממשיכה לפתוח את חלונית הבחירה הקיימת (FR18).
- `fileTypes.ts`: הוספת `isHtmlFile`. בדיקות: `HtmlPreviewDialog.test.tsx` (4 בדיקות). סקירת subagents לא הורצה.
- `app.css`: עיצוב הדיאלוג (80vw × 80vh).
