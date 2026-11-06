**Task:** שרת MCP לקריאה בלבד בשם `fileChange` (`mcp/fileChange/`), בענף `feat/level-5`, לפי `_bmad-output/implementation-artifacts/spec-file-change-mcp.md`.

**סיכום:**
1. tool `recent_changes` (`hours` שלם 1 עד 720; `type` xml/word/excel/image; `minSizeMB`; `subfolder`), resource `changes://last-3-days`, ו-prompt `recent-files` (`days`, `type`, `size`).
2. השורש מ-`FE_ROOT` (ברירת מחדל `src/`), `subfolder` נבדק עם `realpath` ונדחה אם יוצא מהשורש; symlinks מדולגים; תיקייה לא קריאה מדולגת ונספרת; עד 200 תוצאות עם `truncated`.
3. רישום ב-`.mcp.json` בשורש הפרויקט, בלי סודות.
4. נבדק: בדיקות vitest ללוגיקה ולשרת (דרך `InMemoryTransport`), ו-`npm run check` ירוק.
