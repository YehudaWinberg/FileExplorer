---
id: SPEC-file-viewer-mod
companions: []
sources:
  - ../../planning-artifacts/briefs/brief-FileExplorer-2026-11-08/brief.md
---

> **Canonical contract.** This SPEC and the files in `companions:` are the complete, preservation-validated contract for what to build, test, and validate. Source documents listed in frontmatter are for traceability — consult them only if you need narrative rationale or prose color this contract intentionally omits.

# file-viewer Mod

## Why

הזדמנות ללמוד ולהדגים מה Mod ל-Claude Code יכול לעשות ש-skill או פקודה רגילה לא יכולים: לצייר UI קבוע ליד הצ'אט. הפרויקט הוא תרגיל 6 בקורס AI של יהודה ("File viewer · the tree in a pane"), הקוד הראשון בקורס שרץ בתוך Claude Code. כיום, כדי לראות את מבנה הפרויקט תוך כדי שיחה צריך לצאת מהצ'אט (`ls`, `tree` או סייר חיצוני).

## Capabilities

- **CAP-1**
  - **intent:** המשתמש מקליד `/file-viewer` ונפתח pane לצד הצ'אט, כשכותרתו שם תיקיית השורש של הפרויקט.
  - **success:** אחרי הפקודה מוצג pane ליד הצ'אט שכותרתו שם תיקיית השורש של הפרויקט הנוכחי.
- **CAP-2**
  - **intent:** ה-pane מציג את עץ הפרויקט: תיקיות לפני קבצים, פתיחה וסגירה של תיקייה בלחיצה, גודל לכל קובץ ב-KB.
  - **success:** העץ תואם את המאגר. תיקייה נפתחת ונסגרת בלחיצה, לקבצים מוצג גודל ב-KB ולתיקיות לא. `.git` ו-`node_modules` לא מופיעים. תוכן תיקייה נקרא רק כשהיא נפתחת.
- **CAP-3**
  - **intent:** שינוי בקוד המודול מתעדכן בסשן פתוח בלי הפעלה מחדש.
  - **success:** שמירת קובץ במודול מרעננת את ה-pane הפתוח, והסשן לא הופעל מחדש.
- **CAP-4**
  - **intent:** כשל בקריאת הקבצים לא פוגע בסשן ולא מציג מידע חלקי שגוי.
  - **success:** נתיב חסר, שגיאת הרשאה או תיקייה שנעלמה נתפסים ב-`.catch`. הסשן ממשיך לעבוד וה-pane מציג הודעת שגיאה קצרה במקום עץ חלקי.

## Constraints

- קריאה בלבד: המודול קורא רק רשימות תיקיות וגדלים. אין כתיבה, מחיקה, שינוי שם או גישת רשת. Mod אינו ב-sandbox ורץ עם הרשאות המשתמש, וזה גם מדיניות הפרויקט.
- שורש העץ נגזר מתיקיית הפרויקט הנוכחית, לא מנתיב קשיח.
- הקוד נמצא ב-`mods/file-viewer/` בענף `feat/file-viewer-mod`. `claude plugin validate` חייב לעבור, וכל שורת קוד נקראה ונבדקה לפני הטעינה.

## Non-goals

- פתיחת קבצים או תצוגה מקדימה.
- כתיבה, מחיקה או שינוי שם.
- גישת רשת.
- חיפוש, אייקונים, מיון מתקדם.
- הצגת גודל או סיכום לתיקיות.

## Success signal

יהודה מקליד `/file-viewer` בפרויקט FileExplorer ורואה pane עם העץ לצד הצ'אט. הוא פותח וסוגר תיקיות, שומר שינוי במודול ורואה את ה-pane מתעדכן בלי הפעלה מחדש, ו-`claude plugin validate` עובר.
