---
title: 'מחקר טכני: האם entries() ב-Chrome מדלג על קבצים'
type: 'technical'
topic: 'Chrome File System Access API — FileSystemDirectoryHandle.entries() ושמות חסרים'
decision: 'לתקן בקוד, להוסיף הודעה למשתמש או להחליף את דרך קריאת התיקייה ב-FileExplorer'
source: 'native-run'
status: draft
preset: 'quick'
validation: 'normal'
created: '2026-11-20'
updated: '2026-11-20'
---

# מחקר טכני: האם `entries()` ב-Chrome מדלג על קבצים

**ההחלטה שהמחקר משרת:** לתקן בקוד, להוסיף הודעה למשתמש או להחליף את דרך קריאת התיקייה.

## סיכום מנהלים

- **לא נמצאה אף ראיה** ש-`dir.entries()` ב-Chrome מדלג על קבצים נסתרים, קבצי `~$`, קבצי `.txt`/`.url` או קבצי תיקיות מסונכרנות. שלושה חיפושים ממוקדים לא החזירו מקור שמאשר או מפריך זאת [1][2][3]. זו העדר ראיה, לא הוכחה שההתנהגות לא קיימת.
- **ממצא קרוב אחד:** Chrome חוסם בחירה של תיקיות מסוימות מטעמי פרטיות (למשל הורדות ותיקיות מנותבות ברשת) לפי דוחות על false positives [4][5]. זה עוסק בחסימת הבחירה של התיקייה כולה, לא בסינון קבצים בתוכה. אין ראיה שזה קשור לבעיה שלנו.
- **`webkitdirectory`:** לא נמצאה ראיה ש-Chrome מסנן בו קבצים. דוח Mozilla מתאר סינון של קבצים נסתרים ב-Firefox בלבד [6]. אין ראיה שזה עובד אחרת ב-Chrome.

**המלצה:** לא להשקיע בשינוי קוד על בסיס המחקר הזה. הבדיקה האמפירית שנותרה: לפתוח את אותה תיקייה בעזרת דף בדיקה מינימלי עם `entries()` ולרשום את התוצאה, ובמקביל לוודא בחלון הבחירה את הנתיב המדויק שנבחר.

## מימוש בפועל

**שאלה:** האם יש מקרים מתועדים של קבצים שנעלמים מ-`entries()`?

- חיפוש "File System Access API entries() skips hidden files Windows Chrome" החזיר רק תיעוד כללי. הוא לא אישר ולא שלל סינון של קבצים נסתרים. ביטחון: נמוך (העדר ראיה) [1].
- חיפוש במעקב הבאגים של Chromium מצא דוחות על זיהוי שגוי של תיקיות מנותבות כ"תיקיות מערכת", ולא על קבצים חסרים בתוך תיקייה שנבחרה בהצלחה [4][5]. לפי תקציר החיפוש בלבד, לא קראתי את הדפים המלאים ולא בדקתי סטטוס תיקון. ביטחון: נמוך.
- לא נמצא מקור שעוסק בקבצי תיקיות מסונכרנות (Google Drive, OneDrive) ב-`showDirectoryPicker` [3b].

## אינטגרציה וכלים חלופיים

- `<input webkitdirectory>`: אין מקור ש-Chrome מסנן בו קבצים. נאמר רק ש-`webkitEntries` לא מאוכלס שם, ויש לבנות את המבנה מ-`files` ומ-`webkitRelativePath` [2]. מכאן אין ראיה שהוא יחזיר קבצים ש-`entries()` לא החזיר.

## שאלות פתוחות

1. מהי התנהגות Chrome בפועל כשיש בתיקייה קבצים עם מאפייני Hidden/System של NTFS? לא נמצא מקור, דרוש ניסוי ישיר.
2. האם `~$...docx` (קובץ נעילה של Word) מוחזר? אותה בעיה.
3. האם נבחרה תיקייה אחרת מזו שב-Explorer? הלוג שהוספנו הראה שהאפליקציה קיבלה 6 שמות בלבד מ-Chrome, אבל הנתיב שנבחר לא ידוע.

## מקורות

| # | מקור | מפרסם | תאריך פרסום | נגישות |
|---|------|-------|-------------|--------|
| 1 | [The File System Access API: simplifying access to local files](https://developer.chrome.com/docs/capabilities/web-apis/file-system-access) | Chrome for Developers | לא ידוע | 2026-11-20 |
| 2 | [File and Directory Entries API](https://wicg.github.io/entries-api) | WICG | לא ידוע | 2026-11-20 (תקציר חיפוש) |
| 3 | [How to open a directory](https://web.dev/articles/files/open-a-directory) | web.dev | לא ידוע | 2026-11-20 |
| 4 | [Chromium issue 40264254](https://issues.chromium.org/issues/40264254) | Chromium | לא ידוע | 2026-11-20 (תקציר חיפוש בלבד) |
| 5 | [WICG/file-system-access issue 381](https://github.com/WICG/file-system-access/issues/381) | WICG | לא ידוע | 2026-11-20 (תקציר חיפוש בלבד) |
| 6 | [Mozilla bug 1209924](https://bugzilla.mozilla.org/show_bug.cgi?id=1209924) | Mozilla | לא ידוע | 2026-11-20 (תקציר חיפוש בלבד) |

**הערה:** כל המקורות נקראו דרך תקצירי חיפוש בלבד ולא נפתחו במלואם. תאריכי הפרסום לא נבדקו. מחקר ב-preset `quick` עם סבב אחד.
