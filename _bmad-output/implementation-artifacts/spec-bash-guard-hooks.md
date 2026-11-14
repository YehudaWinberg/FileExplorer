---
title: 'hook שומר לפקודות Bash / PowerShell'
type: 'feature'
created: '2026-11-13'
status: 'done'
baseline_commit: '904296080e7504797b9728b1bf2f19de49e554c5'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/CONTRACT.html'
  - '{project-root}/_bmad-output/planning-artifacts/bash-guard-hooks/summary.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** ה-agent יכול להריץ פקודות שמורות למשתמש (מחיקה רקורסיבית, publish, git כותב או הרסני), ואין חסימה טכנית; יש רק כללים כתובים.

**Approach:** hook מסוג `PreToolUse` על Bash ו-PowerShell: סקריפט Node שמנתח את מחרוזת הפקודה לפי `CONTRACT.html` (גובר על `summary.md` בסתירה), חוסם בחסימה מוחלטת (exit 2 + הודעה בעברית ל-agent) ומאפשר את השאר.

## Boundaries & Constraints

**Always:** ללא ספריות חדשות; סקריפט Node ב-`.claude/hooks/`, חיבור ב-`.claude/settings.json` תוך שמירת ה-`permissions` הקיימים; הודעות בעברית שאומרות שהפעולה שמורה למשתמש (ובמחיקה: להציג למשתמש רשימת נתיבים שיבצע); אין מנגנון עקיפה; ניתוח כל פקודה בשרשור (`&&`, `;`, `|`, שורות); `npm run check` עובר; הפרומט נשמר ב-`promt/bash-guard-hooks.md`.

**Never:** commit, push, PR או ענף חדש; שינוי קוד `src/`; חסימת פעולות מותרות (`git status/diff/log`, `git branch <name>`, `checkout -b`, `switch -c`, `rm` לקובץ בודד, `npm run build`, `npm install`); הסתמכות על שרשור פקודות עטופות (`bash -c`) כמגבלה ידועה בלבד.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| חסום: מחיקה רקורסיבית | `rm -rf x`, `rm -r`, `rm --recursive`, `rmdir /s`, `del /s`, `Remove-Item -Recurse`/`-r`, `ri -r`, `find . -delete` | exit 2 + הודעה | stderr בעברית |
| חסום: publish | `npm/pnpm/yarn publish\|unpublish\|deprecate`, `docker push`, `gh release create` | exit 2 | כנ"ל |
| חסום: git כתיבה | `commit`, `push` (גם `--force`), `merge`, `rebase`, `cherry-pick`, `revert`, `am` | exit 2 | כנ"ל |
| חסום: git אובדן מידע | `reset --hard`, `clean` (בלי `--dry-run`), `restore` (בלי `--staged`), `checkout/switch` עם force, `branch -d/-D/-M`, `stash drop/clear`, `tag -d`, `rm`, `reflog`, `gc`, `prune`, `filter-branch` | exit 2 | כנ"ל |
| מותר | `git status/diff/log`, `git branch x`, `git checkout -b x`, `git switch -c x`, `git clean --dry-run`, `git restore --staged f`, `rm file`, `npm run build`, `npm install` | exit 0 | N/A |
| חסום בשרשור | `cd x && git push` | exit 2 | כנ"ל |
| קלט פגום | stdin לא JSON / בלי `command` / כלי אחר | exit 0 (לא חוסם) | לא קורס |

</frozen-after-approval>

## Code Map

- `.claude/settings.json` -- כרגע רק `permissions.allow`; להוסיף `hooks.PreToolUse` עם matcher `Bash|PowerShell`. הקובץ נפתח ב-BOM; לשמור JSON תקין.
- `.claude/hooks/` -- ריק (רק `samples/`); כאן הסקריפטים.
- `CONTRACT.html` -- שורות טבלה עם עמודת אכיפה `Hook (מתוכנן)` (badge `planned`); לעדכן ל-`Hook` (badge `allow`). לא לגעת בשורות Rule / "לא נדרשת"; ה-PR נשאר Rule בלבד.
- `vite.config.ts` -- vitest `environment: 'node'`, ברירת מחדל include; לבדוק שקובץ בדיקה ב-`.claude/hooks/` נאסף (תיקיית נקודה), ואם לא — להוסיף `include` מינימלי.
- `src/readOnly.test.ts` -- סגנון בדיקות קיים (`describe/it/expect`, node:fs); לא לשנות.
- `tsconfig.node.json`, `.oxlintrc.json` -- typecheck כולל רק `src` ו-`vite.config.ts`; oxlint רץ על הכול, לכן קבצי `.mjs` חדשים חייבים לעבור lint (`eqeqeq` וכו'). 
- `promt/*.md` -- פורמט הפרומטים הקיימים (למשל `promt/level6_ex2.md`).

## Tasks & Acceptance

**Execution:**
- [x] `.claude/hooks/guard-rules.mjs` -- פונקציה טהורה `checkCommand(command)` → `{ blocked, reason }`; פיצול לפקודות משנה, טוקנים, כללי CONTRACT -- לוגיקה נבדקת בנפרד
- [x] `.claude/hooks/bash-guard.mjs` -- קורא JSON מ-stdin, קורא ל-`checkCommand`, חסימה = הודעה ל-stderr + exit 2, אחרת exit 0; קלט פגום לא חוסם
- [x] `.claude/settings.json` -- חיבור ה-hook (`node "$CLAUDE_PROJECT_DIR/.claude/hooks/bash-guard.mjs"`), שמירת `permissions`
- [x] `.claude/hooks/bash-guard.test.mjs` -- בדיקות יחידה לכל שורת מטריצה וכל וריאציה, ובדיקות E2E בהרצת התהליך (`git push`/`npm publish` → exit 2 + הודעה; `git diff` → exit 0)
- [x] `CONTRACT.html` -- עדכון עמודת האכיפה לשורות שנאכפות
- [x] `promt/bash-guard-hooks.md` -- שמירת פרומט המשימה

**Acceptance Criteria:**
- Given ה-hook מחובר, when `git push` מגיע ב-stdin כ-JSON של Bash או PowerShell, then exit 2 והודעה בעברית ב-stderr
- Given `git diff`, when הסקריפט רץ כתהליך, then exit 0 ללא פלט חוסם
- Given `npm run check`, when הוא רץ, then עובר במלואו (כולל הבדיקות החדשות ו-lint)

## Implementation Notes

- מימוש ישיר (בלי subagents). נוספו מעבר לספק, בכוונה: חסימת `git checkout -- <path>` / `checkout .` ו-`branch -f` (אותו סיכון אובדן מידע), וחסימת `restore --staged --worktree`.
- בדיקות ה-hook ב-`.claude/hooks/` נאספות על ידי vitest ללא שינוי ב-`vite.config.ts`.
- `settings.json` נכתב ללא BOM.

## Design Notes

false positives כמו `echo "git push"` מקובלים (מגבלה ידועה). ה-hook נטען רק ב-session חדש או `/hooks`. לאחר ההפעלה הוא יחסום גם `git restore` לביטול שינויים — הסרה בעריכת `settings.json` ישירות.

## Verification

**Commands:**
- `npm run check` -- expected: typecheck, lint וכל הבדיקות עוברים
- `echo '{"tool_name":"Bash","tool_input":{"command":"git push"}}' | node .claude/hooks/bash-guard.mjs` -- expected: exit 2 + הודעה
