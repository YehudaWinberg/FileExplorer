---
title: 'סריקת עץ בהדרגה'
type: 'feature'
created: '2026-10-25'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** אין דרך לסרוק תתי-תיקיות; `listEntries` קורא `getFile()` לכל קובץ ולכן איטי מדי לסריקה עמוקה (Story 1.2, FR6, FR7, FR10, FR11).

**Approach:** מתודה קריאה-בלבד `listNames(folder)` ב-`FileSystemAdapter` (בלי `getFile()` ובלי בקשת הרשאה), ומחולל `scanTree(adapter, root, compiled, signal)` ב-`src/lib/scanTree.ts` שסורק BFS ומחזיר `SearchResult = { entry, parent, depth, score }` אחד לכל `yield` (score זמני 0, פריט ישיר = עומק 1). דילוג שקט על `FsError` ועל `SKIP_DIRS` (`node_modules`, `.git`), סיום שקט בביטול ובכשל שורש. אין שינוי ב-UI או ב-state.

</frozen-after-approval>

## Implementation Notes

- `listNames` מחזיר `FileSystemEntry` בלי `size`/`modified`; תיקיות מקבלות `folder` כדי שאפשר לרדת אליהן, וקבצים נרשמים ל-`getFile` עתידי.
- בסריקה בודקים הרשאה עם `queryPermission` בלבד; אם אינה `granted` נזרק `FsError('permission')` ללא בקשה.
- נוסף `listNames` למדומי ה-adapter בארבעה קבצי בדיקה קיימים (נדרש ל-typecheck).
- ביצועים (adapter בזיכרון, כ-9,300 קבצים ב-5 רמות): תוצאה ראשונה ~0.1ms, קובץ בעומק 5 ~1.3ms. אלה מספרי יעד בסביבת בדיקה, לא הבטחה לדיסק אמיתי.

## Review Triage Log

- בדיקת abort אחרי `await listNames`: false; הלולאה בודקת `signal.aborted` לפני כל פריט, ולכן אין yield אחרי ביטול.
- "הרבה יותר מ-10,000 קבצים": false; העץ הוא 9,330 קבצים.
- כשל בשורש/תיקייה מדולגת לא מדווח: low כאן, כי ה-AC דורש סיום שקט; הדיווח ל-UI שייך ל-1.3 (נדחה).
- `files`/`folders` ב-adapter גדלים בסריקה עמוקה: medium אך מחוץ לטווח (עד 500 תוצאות, אין ניקוי קיים); נדחה.
- מיזוג `requireGrantedPermission` עם `ensureReadPermission`, מחזיר `.git` מתאים, הגנת מעגלים, מפעל mock משותף: low; לא טופלו.
