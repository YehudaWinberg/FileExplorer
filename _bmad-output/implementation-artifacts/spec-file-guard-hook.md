---
title: 'hook שומר לקבצים רגישים (.env ו-settings.json)'
type: 'feature'
created: '2026-11-15'
status: 'done'
baseline_commit: 'b14fadab9984e29b3ade3055aa332959785908ad'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/planning-artifacts/briefs/brief-FileExplorer-2026-11-15/brief.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-bash-guard-hooks.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** ה-agent יכול לקרוא קבצי `.env` (סודות) ולערוך את `.claude/settings.json` (ולהסיר את ה-hooks שמגנים עליו). ההגנה הקיימת מכסה רק פקודות Bash/PowerShell.

**Approach:** hook `PreToolUse` חדש (Node, ללא ספריות) שחוסם קריאה וכתיבה של קבצים מוגנים ומחזיר JSON עם `permissionDecision: "deny"` וסיבה בעברית. לוגיקה טהורה ב-`guard-files.mjs`, אדפטר דק ב-`file-guard.mjs`, בתיקייה חדשה `.claude/hooks/files/`.

## Boundaries & Constraints

**Always:** ללא ספריות חדשות. Matcher: `Read|Edit|Write|Grep|PowerShell`. מוגן: שם קובץ שמסתיים ב-`.env` או מתחיל ב-`.env.` (כולל `.env.example`), וכן `settings.json` שתיקיית האב שלו `.claude` (פרויקט או משתמש). נתיבי Windows (`\`), אותיות גדולות/קטנות, יחסי/מוחלט, נקודות/רווחים בסוף השם ו-`:stream` מטופלים. כשל (stdin פגום, חסר `file_path` ב-Read/Edit/Write, חריגה פנימית) = deny עם הסבר. `Grep` נבדק לפי `path` ו-`glob`, ו-`PowerShell` לפי טוקנים בפקודה (היוריסטי). פלט deny ב-stdout, exit 0. הודעות ובדיקות בעברית. שמירת `permissions` והערך הקיים של bash-guard ב-settings. `npm run check` עובר. הפרומט נשמר ב-`promt/file-guard-hooks.md`.

**Never:** commit, push, PR או ענף חדש; שינוי `src/`; הזזה או שינוי של קבצי bash-guard / guard-rules (הועבר ל-deferred-work); חסימת `Glob` ו-`settings.local.json`; הרחבת matcher ל-Bash (נשאר מגבלה ידועה).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| חסום: env | Read/Edit/Write על `.env`, `a/.env.local`, `config.env`, `C:\p\.ENV`, `.env.` | deny JSON + סיבה | exit 0 |
| חסום: settings | `.claude/settings.json`, `.claude\settings.json`, `~/.claude/settings.json` | deny | כנ"ל |
| מותר | `src/App.tsx`, `package.json`, `settings.json` מחוץ ל-`.claude`, `.claude/settings.local.json`, `environment.ts` | אין פלט, exit 0 | N/A |
| Grep | `path` על קובץ מוגן, או `glob` עם `.env`/`settings.json`; בלי path | deny / deny / מותר | כנ"ל |
| PowerShell | `Get-Content .env`, `type .claude\settings.json` / `npm run check` | deny / מותר | כנ"ל |
| קלט פגום | stdin לא JSON, Read בלי `file_path` | deny + הסבר | לא קורס |

</frozen-after-approval>

## Code Map

- `.claude/hooks/bash-guard.mjs` -- תבנית לאדפטר: קריאת stdin, `JSON.parse`, ייבוא פונקציית בדיקה. לא לשנות.
- `.claude/settings.json` -- `hooks.PreToolUse` עם matcher `Bash|PowerShell`; להוסיף ערך שני, בלי BOM, ובלי לגעת בנתיב הקיים וב-`permissions`.
- `vite.config.ts` -- vitest אוסף בדיקות מ-`.claude/hooks/`; `.oxlintrc.json` חל גם על `.mjs`.
- `promt/bash-guard-hooks.md` -- פורמט פרומט קיים.

## Tasks & Acceptance

**Execution:**
- [x] `.claude/hooks/files/guard-files.mjs` -- `checkFilePath(p)` ו-`checkToolCall(input)` טהורות → `{ blocked, reason }`
- [x] `.claude/hooks/files/file-guard.mjs` -- אדפטר: stdin → בדיקה → JSON deny; כשל = deny
- [x] `.claude/hooks/files/guard-files.test.mjs` -- יחידה לכל שורת מטריצה + E2E בתהליך (פלט JSON ו-exit 0)
- [x] `.claude/settings.json` -- רישום file-guard, שמירת `permissions` ו-bash-guard (אחרון, כי אחריו ה-hook חוסם עריכה)
- [x] `promt/file-guard-hooks.md` -- שמירת הפרומט

**Acceptance Criteria:**
- Given hook מחובר, when Read/Write/Edit על `.env` או `.claude/settings.json`, then JSON עם `permissionDecision: "deny"` וסיבה בעברית
- Given נתיב אחר, when ה-hook רץ, then אין פלט ו-exit 0
- Given `npm run check`, when רץ, then עובר, ובדיקות bash-guard עוברות ללא שינוי

## Implementation Notes

## Spec Change Log

## Review Triage Log

| ממצא | verdict | ניתוב | ראיה |
|------|---------|-------|------|
| `.claude//settings.json`, `.claude/./settings.json`, `.claude./settings.json` עוקפים | medium | patch (תוקן) | `split` בדק רק את מקטע האב הגולמי; נוסף נרמול מקטעים ובדיקות |
| `-Path:.env` ב-PowerShell | medium | patch (תוקן) | הטוקן נחתך ב-`:stream`; נבדקים גם חלקי הטוקן אחרי `:` |
| `C:.env` (כונן יחסי) | low | patch (תוקן) | קידומת הכונן נחתכה כ-stream; מוסרת לפני הפירוק |
| Grep עם `path`/`glob` שאינם מחרוזת מותר | medium | patch (תוקן) | סותר "קלט פגום = deny" |
| `process.exit` מיד אחרי כתיבה ל-stdout; חסר handler ל-stdin error | medium | patch (תוקן) | כתיבה לצינור עלולה להיקטע; exit עבר ל-callback |
| אין בדיקה לרישום ב-settings.json; בדיקת E2E תלויה ב-cwd | medium | patch (תוקן) | נוספה בדיקת matcher/נתיב/permissions; הנתיב נגזר מ-`import.meta.url` |
| Bash לא מכוסה; Grep על תיקייה; wildcard/משתנים ב-PowerShell; `settings.local.json` | false | נדחה | המפרט מוציא אותם במפורש (Never / Design Notes / "יוריסטי") |
| `.env.example` נחסם; ענף חדש; vitest לא מריץ את הבדיקות | false | נדחה | המפרט כולל `.env.example`; ענף: "בלי ענף חדש"; הרצה הוכחה (335 בדיקות) |
| הגנה על סקריפטי ה-hook עצמם | medium | defer | חשיפה זהה קיימת ל-bash-guard; מחוץ ל-intent |
| false positive (`process.env`), glob מורחב (`.environment.ts`), `!.env`, symlink/8.3, timeout, bidi, תיעוד | low | נדחה | היוריסטיקה מוצהרת/fail-closed; תיקון מוסיף מורכבות |

## Design Notes

ה-hook נטען מחדש רק ב-session חדש או `/hooks`. אחרי הפעלתו הוא יחסום גם עריכה של `settings.json` על ידי ה-agent, ולכן עדכון ה-settings נעשה אחרון. `cat .env` דרך כלי Bash עוקף (מחוץ ל-matcher). חיפוש `Grep` בתיקייה שמכילה `.env` עדיין יחשוף ערכים.

## Verification

**Commands:**
- `npm run check` -- expected: typecheck, lint וכל הבדיקות עוברים
- `echo '{"tool_name":"Read","tool_input":{"file_path":".env"}}' | node .claude/hooks/files/file-guard.mjs` -- expected: JSON deny, exit 0
