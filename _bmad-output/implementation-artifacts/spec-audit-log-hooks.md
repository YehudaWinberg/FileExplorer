---
title: 'hook יומן ביקורת (audit log) ב-JSONL'
type: 'feature'
created: '2026-11-20'
status: 'done'
baseline_commit: '25933d91b79ec9b879f37b65b6965ef6aea23764'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/promt/audit-log-hooks.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-file-guard-hook.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** אין תיעוד של מה הסוכן עשה ומתי. אי אפשר לשחזר אילו כלים הופעלו, על מה, ובאיזה session.

**Approach:** hook חדש (Node, בלי ספריות) לאירועים `PreToolUse`, `PostToolUse`, `Stop`, שמוסיף שורת JSON ליומן יומי `logs/agent-audit-YYYY-MM-DD.jsonl`. הוא צופה בלבד: כל כשל מסתיים ב-exit 0 בלי פלט.

## Boundaries & Constraints

**Always:** ללא ספריות חדשות. רשומה: `timestamp` (ISO מקומי עם offset), `session_id`, `event`, `tool`, `target`. `target`: `command` (Bash/PowerShell), אחרת `file_path`, `path`, `pattern`, אחרת `null`. ב-`Stop`: `tool` ו-`target` הם `null`. הסתרה לפני חיתוך: `password|passwd|token|api_key|secret` עם `=`/`:`/דגל `--name value`, `Bearer <x>`, ו-`sk-...` הופכים ל-`[REDACTED]` (שם המשתנה נשאר); אחר כך חיתוך ל-200 תווים. קובץ לפי תאריך מקומי; הנתיב מ-`CLAUDE_PROJECT_DIR` (או `cwd`) והתיקייה `logs/` נוצרת אם חסרה. כתיבה אסינכרונית ב-append, עם timeout של 2 שניות, ושעון עצר כללי שמסיים ב-exit 0 גם אם stdin נתקע. timeout של 5 שניות ב-settings. אירוע לא מוכר, קלט פגום או שגיאת כתיבה = דילוג שקט, exit 0. לוגיקה טהורה בנפרד מהאדפטר, הודעות והערות בעברית. אין שינוי בהתנהגות ה-hooks הקיימים. החלטה: הרישום ב-`.claude/settings.json` נעשה ידנית על ידי המשתמש (ה-`file-guard` נשאר פעיל); הסוכן רק מספק את הקטע ב-Design Notes.

**Never:** commit, push, PR או ענף חדש; שינוי `src/` או קבצי ה-hooks הקיימים; חסימת פעולה; כתיבת פלט ל-stdout; עקיפת `file-guard`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Pre/Post רגיל | `Edit` עם `file_path` | שורה עם event, tool, target=הנתיב | N/A |
| Bash עם סוד | `curl -H "Authorization: Bearer abc" --password=x` | `Bearer [REDACTED]`, `--password=[REDACTED]` | N/A |
| Stop | אירוע `Stop` | שורה עם `tool` ו-`target` = `null` | N/A |
| פקודה ארוכה | command > 200 תווים | נחתך ל-200 אחרי הסתרה | N/A |
| כשל כתיבה | `logs` לא ניתן לכתיבה / קלט פגום / אירוע לא מוכר | אין פלט, exit 0 | דילוג שקט |
| פעולה חסומה | PreToolUse שה-hooks האחרים חוסמים | נרשם Pre; אין Post | N/A |

</frozen-after-approval>

## Code Map

- `.claude/hooks/files/file-guard.mjs` -- תבנית אדפטר (stdin, JSON.parse, `process.exit` אחרי כתיבה). הפוך ממנו: כאן אין deny.
- `.claude/hooks/check-on-stop/check-on-stop.mjs` -- דוגמה ל-fail-open, `CLAUDE_PROJECT_DIR` ו-`cwd`.
- `.claude/hooks/files/guard-files.test.mjs` -- תבנית בדיקות: יחידה + `spawnSync` על האדפטר.
- `.claude/settings.json` -- מוגן; לא לערוך מהסוכן.
- `.gitignore` -- `logs` כבר מוחרג. `vite.config.ts` אוסף בדיקות מ-`.claude/hooks/`.

## Tasks & Acceptance

**Execution:**
- [x] `.claude/hooks/audit-log/audit-entry.mjs` -- `redact`, `extractTarget`, `buildEntry`, `dayFileName` טהורות
- [x] `.claude/hooks/audit-log/audit-log.mjs` -- אדפטר: stdin, כתיבה אסינכרונית עם timeout ושעון עצר, תמיד exit 0
- [x] `.claude/hooks/audit-log/audit-log.test.mjs` -- יחידה לכל שורת מטריצה + E2E (תיקיית temp דרך `CLAUDE_PROJECT_DIR`, אין פלט, exit 0, כשל כתיבה)

**Acceptance Criteria:**
- Given hook מחובר, when מופעל כלי, then נוספת שורת JSON תקינה אחת לקובץ היום
- Given סוד בפקודה, when נכתבת רשומה, then הוא אינו מופיע בקובץ
- Given שגיאה בכתיבה, when ה-hook רץ, then exit 0 ובלי פלט
- Given `npm run check`, when רץ, then עובר

## Implementation Notes

מומש ישירות (בלי subagents) ב-`.claude/hooks/audit-log/`: `audit-entry.mjs`, `audit-log.mjs`, `audit-log.test.mjs` (14 בדיקות). `npm run check` עבר (29 קבצי בדיקה, 373 בדיקות). `.claude/settings.json` לא נערך, לפי ההחלטה: הרישום ידני.

## Review Triage Log

סקירה עצמית אחת (המשתמש בחר בה במקום שלושת הסוקרים הנפרדים).

| Finding | Verdict | Evidence |
|---|---|---|
| ערך סיסמה שמכיל `&` או `;` נחתך בהסתרה (`password=a&b` משאיר `b`) | low | ה-regex עוצר ב-`& ; , "` כדי שלא ייבלע שאר URL; הפשרה מכוונת ונדירה |
| דגל כמו `--token-file path` לא מוסתר | false | זה נתיב ולא סוד; אין דליפה |
| כתיבות מקבילות של כמה hooks לאותו קובץ | false | `appendFile` ב-append, שורה קצרה אחת לכל כתיבה |
| stdin נתקע או כתיבה איטית | false | שעון עצר של 4 שניות ו-timeout כתיבה של 2 שניות, נבדק ב-E2E |

## Design Notes

PostToolUse לא מופעל על פעולה שנחסמה, ולכן חסימה נראית כ-Pre בלי Post תואם. קטע לרישום ידני ב-settings (בלי matcher, כדי לכסות כל כלי; ב-`PreToolUse` ראשון):

```json
{ "hooks": [ { "type": "command", "timeout": 5, "command": "node \"$CLAUDE_PROJECT_DIR/.claude/hooks/audit-log/audit-log.mjs\"" } ] }
```

## Verification

**Commands:**
- `npm run check` -- expected: typecheck, lint ובדיקות עוברים

**Manual checks (if no CLI):**
- אחרי הרישום: הפעלת כלי ובדיקה שנוצרה שורה ב-`logs/agent-audit-<תאריך>.jsonl`
