# audit-log-hooks — פרומט המשימה

ענף: `feat/level-6`. מקור: שיחת דרישות עם Mary (bmad-agent-analyst).

## משימה

לממש hook (Node, בלי ספריות) שכותב יומן ביקורת (audit log) של פעולות הסוכן בפורמט JSONL, לשלושה אירועים: `PreToolUse`, `PostToolUse`, `Stop`.

## דרישות

- **קובץ:** `logs/agent-audit-YYYY-MM-DD.jsonl`, קובץ לכל יום לפי תאריך מקומי. כתיבה בהוספת שורה (append). התיקייה `logs/` נוצרת אם חסרה.
- **שדות ברשומה:** `timestamp`, `session_id`, `event`, `tool`, `target`. ב-`Stop`: `tool` ו-`target` הם `null`.
- **`target`:** נתיב קובץ (Read/Edit/Write/Grep) או הפקודה (Bash/PowerShell). נחתך ל-200 תווים.
- **הסתרת סודות:** `password`, `token`, `api_key`, `secret`, `Authorization: Bearer ...` ומפתחות בפורמט `sk-...` מוחלפים ב-`[REDACTED]`. שם המשתנה נשאר, הערך מוסתר.
- **עמידות בכשל (fail-open):** כל שגיאה (קלט פגום, הרשאות, דיסק) מסתיימת ב-`exit 0` ואינה חוסמת. timeout של 5 שניות ל-hook ב-settings.json ו-2 שניות לכתיבה עצמה.
- **חסימות נרשמות גם הן:** ה-hook של הלוג ראשון ברשימת ה-`PreToolUse`, כדי שגם פעולה שה-hooks הקיימים חוסמים תירשם.

## הנחיות

- hook נפרד ב-`.claude/hooks/audit-log/`: לוגיקה טהורה ב-`audit-log.mjs` (או שם דומה), אדפטר, וקובץ בדיקות `*.test.mjs`, לפי התבנית של ה-hooks הקיימים.
- אין שינוי בהתנהגות ה-hooks הקיימים (bash-guard, file-guard, fs-service-guard, check-on-stop). ברישום ב-`.claude/settings.json` שומרים על `permissions` ועל כל ה-hooks הקיימים.
- `logs` כבר ב-`.gitignore`.
- אין commit, push, PR או ענף חדש; אין שינוי ב-`src/`.
- `npm run check` חייב לעבור.
