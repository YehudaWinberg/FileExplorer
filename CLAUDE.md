@AGENTS.md

## Headless audit script (`scripts/audit-rule.ps1`)

סקריפט ביקורת שרץ ללא השגחה (מתאים ל-Background Agents): הכלל הנבדק הוא "אין import של react/react-dom ב-`src/lib/**`, כולל `import type`".

- הרצה: `powershell -NoProfile -File scripts\audit-rule.ps1` (פרמטרים: `-ProjectRoot`, `-MaxTurns`, `-MaxBudgetUsd`, `-TimeoutSec`, `-ReportPath`, `-EnvelopePath`, `-VerifyTreeUnchanged`).
- קודי יציאה (חוזה יציב): `0` נקי והושלם · `1` נמצאו הפרות (מודפס `file:line - message`) · `2` הרצה לא הושלמה · `3` כשל בסקריפט. השורה האחרונה ב-stdout היא תמיד JSON אחד.
- הסקריפט מחליט רק לפי `structured_output` מהמעטפת המלאה, אף פעם לא לפי `result`.
- הרצה נחשבת נקייה רק אם: `subtype == "success"`, `is_error == false`, קיים `structured_output`, `completed == true`, ו-`filesScanned` שווה למספר קבצי ה-`.ts/.tsx` שהסקריפט סופר בעצמו.

לקחים שנמדדו בפועל (Claude Code 2.1.330):
- חריגה ממגבלת turns: `subtype` = `error_max_turns`, `is_error` = `true`, `terminal_reason` = `max_turns`, אין `result` ואין `structured_output`, וה-exit של `claude` הוא 1.
- הפרומט מועבר דרך stdin (`claude -p` בלי ארגומנט) ואז ה-stdin נסגר: אין בעיות מירכאות וה-claude אף פעם לא ממתין לקלט.
- ב-PowerShell 5.1: קובץ `.ps1` עם עברית חייב להישמר כ-UTF-8 עם BOM; ו-`$PSScriptRoot` ריק בברירת מחדל של פרמטר, לכן מחשבים נתיבים אחרי בלוק ה-`param`.
- כלים: `--tools "Read,Grep,Glob"` ו-`--disallowedTools "mcp__*"`. נעילה לפי פרויקט בתיקיית ה-temp מונעת שתי ריצות במקביל.
- הוכחות הריצה נשמרות ב-`scripts/proof/`.
