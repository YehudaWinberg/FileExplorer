# file-guard-hooks — פרומט המשימה

ענף: `feat/level-6`. מקור: `_bmad-output/implementation-artifacts/spec-file-guard-hook.md`.

## משימה

לממש hook מסוג `PreToolUse` (Node, בלי ספריות) שחוסם קריאה וכתיבה של קובצי `.env` ו-`.claude/settings.json`. matcher: `Read|Edit|Write|Grep|PowerShell`. הפלט: JSON עם `permissionDecision: "deny"` וסיבה בעברית, ו-exit 0.

## הנחיות

- לוגיקה טהורה ב-`.claude/hooks/files/guard-files.mjs`, אדפטר ב-`file-guard.mjs`, בדיקות ב-`guard-files.test.mjs`.
- כשל (קלט פגום, חסר `file_path`, חריגה) = deny עם הסבר.
- רישום ב-`.claude/settings.json` אחרון, תוך שמירת `permissions` וה-hook של bash-guard.
- אין commit, push, PR או ענף חדש; אין שינוי ב-`src/`.
- `npm run check` חייב לעבור.
