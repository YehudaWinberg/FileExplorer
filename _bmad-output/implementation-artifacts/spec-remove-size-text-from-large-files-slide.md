---
title: 'הסרת טקסט הגודל מסרגל "סימון קבצים גדולים"'
type: 'chore'
created: '2026-11-13'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** בעמודת "סימון קבצים גדולים" מופיע ליד הסרגל (slide) גם טקסט עם גודל הקובץ, והמשתמש לא רוצה אותו שם.

**Approach:** להסיר את טקסט הגודל מהתא; הסרגל והסמן נשארים. עמודת "גודל" הנפרדת נשארת ללא שינוי (הבהרת המשתמש: רק הטקסט בתוך ה-slide יוצא).

</frozen-after-approval>

## Implementation Notes

- `src/components/FileList.tsx` -- הוסר ה-`span.size-scale__text` מ-`LargeFileCell`.
- `src/styles/app.css` -- נמחק הכלל `.size-scale__text` שנשאר ללא שימוש.
