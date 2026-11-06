---
title: 'שרת MCP לקריאה בלבד: fileChange'
type: 'feature'
created: '2026-11-06'
status: 'done'
baseline_commit: 'f8d2499124335858acec72779183a5829a9b4055'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/specs/spec-file-explorer-mcp/SPEC.md'
  - '{project-root}/.claude/rules/lib-operations.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** משימת קורס: לתת ל-Claude דלת צרה אל הפרויקט, לא גישה רחבה. צריך שרת MCP (stdio) עם tool אחד, resource אחד ו-prompt אחד, כולם לקריאה בלבד.

**Approach:** שרת `fileChange` ב-`mcp/fileChange/` שמחזיר קבצים ששונו לאחרונה בתוך שורש קבוע (`FE_ROOT`, ברירת מחדל `src/`), הרשום ב-`.mcp.json` של הפרויקט. החוזה המלא ב-SPEC.md שברשימת `context`.

## Boundaries & Constraints

**Always:**
- קריאה בלבד: השרת לא כותב, לא מוחק ולא שומר מצב. כתיבה מותרת רק בבדיקות, בתיקיית זמני.
- השורש מגיע מ-`FE_ROOT` ולא מפרמטר של הכלי; נפתר ביחס לשורש הפרויקט (לא ל-cwd) ל-נתיב מוחלט.
- `subfolder` נבדק לאחר פתרון נתיב מלא (`realpath`) ונדחה אם יוצא מהשורש (`..`, נתיב מוחלט, symlink). קיצורי דרך (symlink) בסריקה מדולגים. תיקייה לא קריאה מדולגת ונספרת; לא קורסים.
- אימות קלט בסכמת zod של ה-SDK: `hours` שלם 1 עד 720; `type` enum (`xml`/`word`/`excel`/`image`) רשות; `minSizeMB` חיובי רשות; `subfolder` מחרוזת רשות.
- ה-stdout שמור לפרוטוקול; לוגים ל-stderr. נתיבי SDK 1.x בלבד. בלי סודות ב-`.mcp.json`.
- `npm run check` ירוק. אפליקציית ה-Web ו-`src/` לא משתנים.

**Never:**
- שורש כפרמטר של הכלי, זיכרון בין הרצות, resource שני, תלות חדשה מלבד `@modelcontextprotocol/sdk` ו-`zod` (כבר מותקנות), קריאות רשת, ופתיחת ענף חדש (נשארים על `feat/level-5`).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| חיפוש בסיסי | `hours=72` | קבצים עם mtime בטווח, מהחדש לישן, נתיבים יחסיים לשורש | N/A |
| סינון | `type=word`, `hours=48` / `minSizeMB=2`, `hours=24` | רק סיומות Word / רק קבצים מעל 2MB | N/A |
| קלט שגוי | `hours="abc"`, `0`, `9999`, `type="pdf"` | נדחה על ידי הסכמה, הקוד לא רץ | שגיאת אימות |
| בריחה מהשורש | `subfolder="../.."`, נתיב מוחלט, symlink החוצה | נדחה | תוצאת שגיאה ברורה |
| תת-תיקייה חסרה | `subfolder` שאינו קיים | תוצאת שגיאה | לא קורס |
| תיקייה לא קריאה | הרשאה נדחתה בעומק | מדולגת, `skipped` מדווח | לא קורס |
| תוצאות רבות | יותר מ-200 קבצים | 200 הראשונים + `truncated: true` | N/A |

</frozen-after-approval>

## Code Map

- `package.json` -- ה-SDK (1.32.2) ו-zod (4.6.7) כבר מותקנים; ה-`type` הוא `module`. Node 20 ומעלה, לכן קוד JS רגיל (`.mjs`), כמו `scripts/open-fullscreen.mjs`.
- `vite.config.ts` -- vitest בסביבת `node`, מזהה בדיקות בכל התיקיות, כולל `mcp/`.
- `.oxlintrc.json` -- lint חל גם על `mcp/`; הכללים הייעודיים רק ל-`src/lib`.
- `tsconfig.*.json` -- אינם כוללים `mcp/`; לא נדרש שינוי.
- `src/readOnly.test.ts` -- בדיקת קריאה בלבד ל-`src` בלבד; דפוס לשכפול ל-`mcp/`.
- `.claude/rules/lib-operations.md` -- כללי נתיבים וטיפול בשגיאות הרשאה.
- `.mcp.json` -- לא קיים; ייווצר בשורש.
- `promt/` -- פרומט המשימה נשמר כאן.

## Tasks & Acceptance

**Execution:**
- [x] `mcp/fileChange/findRecentChanges.mjs` -- לוגיקה טהורה: פתרון נתיב בטוח, סריקה (בלי symlinks, מדלג `node_modules` ו-`.git`), סינון זמן/סוג/גודל, מיון, תקרת 200 -- בסיס לבדיקות
- [x] `mcp/fileChange/createServer.mjs` -- `McpServer` בשם `fileChange`: tool `recent_changes`, resource `changes://last-3-days`, prompt `recent-files` (`days` חובה; `type`, `size` רשות; כולם מחרוזות) -- ניתן לבדיקה בלי stdio
- [x] `mcp/fileChange/index.mjs` -- נקודת כניסה: קורא `FE_ROOT`, מחבר `StdioServerTransport` -- ההפעלה האמיתית
- [x] `.mcp.json` -- שרת `fileChange`: `node mcp/fileChange/index.mjs`, `env.FE_ROOT` = `${FE_ROOT:-src}` -- הרישום בפרויקט
- [x] `mcp/fileChange/findRecentChanges.test.mjs`, `mcp/fileChange/createServer.test.mjs` -- בדיקות לכל שורות המטריצה; השרת דרך `InMemoryTransport` ו-`Client` של ה-SDK -- הוכחה שהסכמה דוחה קלט
- [x] `promt/mcp-file-change.md` -- פרומט המשימה בעברית, לפי התבנית של שאר הקבצים בתיקייה

**Acceptance Criteria:**
- Given השרת מחובר, when נקרא `listTools`/`listResources`/`listPrompts`, then יש בדיוק `recent_changes`, `changes://last-3-days` ו-`recent-files`.
- Given קלט שגוי לכלי, when הוא נשלח, then הוא נדחה לפני הרצת הלוגיקה.
- Given `subfolder` שיוצא מהשורש, when הכלי נקרא, then אין קריאה מחוץ לשורש.
- Given `npm run check`, when הוא רץ, then הוא עובר, ואפליקציית ה-Web ללא שינוי.

## Implementation Notes

## Spec Change Log

## Review Triage Log

| ממצא | פסק דין | נתיב | ראיה |
|---|---|---|---|
| `isInside` דחה `..cache` | medium | patch | `startsWith('..')` תופס שמות חוקיים; תוקן ונוספה בדיקה |
| handler של המשאב לא תופס `PathError` | medium | patch | שגיאת פרוטוקול גולמית, בניגוד לכלי; תוקן ונבדק |
| בדיקת symlink ריקה (mtime אחרי `now`, ו-`return` שקט) | medium | patch | הקובץ הוחרג בגלל mtime ולא בגלל ה-symlink; תוקן |
| תיקייה לא קריאה ו-`skipped` ללא בדיקה | medium | patch | שורת מטריצה ללא כיסוי; נוספה בדיקה עם `EACCES` |
| חלון 72 שעות של המשאב ו-`type`/`minSizeMB` בשרת לא נבדקו | medium | patch | נוספו קבצים ישנים ולא תואמים |
| בדיקת קלט שגוי בולעת שגיאות | low | patch | הוסר `.catch` |
| נקודת הכניסה `index.mjs` ללא בדיקה | low | defer | עטיפה דקה; נבדקה ידנית עם `initialize` |
| קבצי עתיד, זיכרון/עומק סריקה, `subfolder` בשם `.git`, אימות ארגומנטי prompt, בדיקת שורש בהפעלה, מיקום תלויות, בדיקת קריאה בלבד ל-`mcp/`, args יחסי ב-`.mcp.json` | low | reject | אין נזק ממשי בשימוש רגיל ותיקון מוסיף מורכבות; הספק קובע ארגומנטים כמחרוזות ו-`node mcp/fileChange/index.mjs` |

## Design Notes

כניסה ל-`index.mjs` בלבד קוראת env ומדפיסה; `createServer(root)` מקבל שורש כפרמטר לצורך בדיקות. פתרון שורש ברירת המחדל: `path.resolve(projectRoot, process.env.FE_ROOT || 'src')`, כש-`projectRoot` נגזר מ-`import.meta.url` ולא מ-cwd.

## Verification

**Commands:**
- `npm run check` -- expected: typecheck, lint ובדיקות עוברים
- `claude mcp get fileChange` -- expected: Scope: project

**Manual checks (if no CLI):**
- בסשן Claude Code: אשר את השרת מ-`.mcp.json`; `/mcp` מציג Connected; Claude קורא ל-`recent_changes` מעצמו; `@` מציג את המשאב; `/mcp__fileChange__recent-files` רץ.
