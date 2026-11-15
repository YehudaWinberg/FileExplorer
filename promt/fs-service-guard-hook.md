# fs-service-guard-hook — פרומט המשימה

ענף: `feat/level-6`. תרגיל בקורס AI: hook מסוג `PostToolUse`.

## משימה

לכתוב hook מסוג `PostToolUse` על `Edit|Write`. כשהסוכן כותב או עורך קובץ תחת תיקייה בשם `components`, ה-hook בודק מה נכתב. אם נכתבה גישה ישירה ל-File System API, הוא מחזיר לסוכן הודעה: אסור לגשת ל-File System API מתוך components; חובה לעבור דרך `src/lib`, שם כבר קיים שירות (`BrowserFileSystemAdapter`) שפונה ל-API.

## הנחיות

- לוגיקה טהורה ב-`.claude/hooks/file-system-service-guard/guard-fs-service.mjs`, אדפטר ב-`fs-service-guard.mjs`, בדיקות ב-`guard-fs-service.test.mjs`.
- בלי ספריות, בלי שינוי ב-`src/`.
- רישום ב-`.claude/settings.json` תחת `PostToolUse`, תוך שמירת ה-hooks הקיימים.
- אין commit, push או PR. `npm run check` חייב לעבור.
