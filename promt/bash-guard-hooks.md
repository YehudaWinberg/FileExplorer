# bash-guard-hooks — פרומט המשימה

ענף: `feat/level-6`. הפעלה: `/bmad-build` עם הארגומנט
`_bmad-output/planning-artifacts/bash-guard-hooks/summary.md`.

## משימה

לממש hook מסוג `PreToolUse` על Bash ו-PowerShell שחוסם (exit 2 + הודעה בעברית ל-agent) פעולות השמורות למשתמש: מחיקה רקורסיבית, publish, git כותב או הרסני. מקור הכללים: `CONTRACT.html` (גובר על `summary.md` בסתירה).

## הנחיות

- ענף לפי כלל הפרויקט; אין commit, push או PR.
- ללא ספריות חדשות: סקריפט Node ב-`.claude/hooks/`, חיבור ב-`.claude/settings.json`.
- בדיקות Vitest: יחידה לכל כלל ווריאציה, והרצה כתהליך עם JSON ב-stdin (`git push` / `npm publish` → exit 2, `git diff` → exit 0).
- לעדכן ב-`CONTRACT.html` את עמודת האכיפה.
- `npm run check` חייב לעבור לפני דיווח הצלחה.
- החלטות: `merge`, `rebase`, `cherry-pick`, `revert`, `am` חסומים; `docker push` ו-`gh release create` חסומים; הפרומט נשמר ב-`promt/`.
