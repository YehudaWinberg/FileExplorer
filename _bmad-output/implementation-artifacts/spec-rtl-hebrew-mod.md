---
title: 'Mod ל-Claude Code: עברית מימין לשמאל (rtl-hebrew)'
type: 'feature'
created: '2026-11-22'
status: 'done'
baseline_commit: '0a88212ba46273e92df9d158d1367d9e227938eb'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/planning-artifacts/briefs/brief-FileExplorer-2026-11-22-rtl-hebrew/brief.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** בטרמינל של Claude Code עברית מעורבת באנגלית מתיישרת שמאלה ומתהפכת, ואין RTL כמו ב-extension של VS Code.

**Approach:** plugin עצמאי (Mod) ב-`C:\FileExplorer\rtl-hebrew\`, מחוץ ל-repo, שמצייר שורות עברית ב-`Text dir="rtl"` לתשובות Claude ולפרומפט שנשלח, ומציג את הטיוטה בזמן הקלדה בשורת מראה מעל הפרומפט.

## Boundaries & Constraints

**Always:** מבנה plugin תקני (`.claude-plugin/plugin.json`, `hooks/hooks.json`, `hooks/register.tsx`, `README.md` בעברית). שורה בלי עברית (U+0590–U+05FF) עוברת ב-`next(e)` ללא שינוי. בלוקי קוד (` ``` `) נשארים LTR. hook שנכשל חייב לא לשבור את התצוגה (`.catch` עם `next(e)`). הפעלה ל-`--plugin-dir` בפיתוח.

**Never:** לא לשנות קבצים ב-`C:\FileExplorer\FileExplorer` מלבד קובץ ה-spec. לא להוסיף תווי כיוון (RLM/RLE) לטיוטת הקלט או לפרומפט שנשלח ל-Claude. לא לכתוב ל-`~\.claude\dev-mods\`. לא commit, push או PR. בלי תלויות חדשות.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| תשובה בעברית | `AssistantMessage` עם שורה "הקובץ `a.ts` שונה" | השורה ב-`Text dir="rtl"` | N/A |
| תשובה באנגלית | טקסט בלי עברית | `next(e)`, ציור המנוע | N/A |
| בלוק קוד בתשובה עם עברית | fence ולפניו שורת עברית | הקוד ללא `dir`, ה-fence כמות שהוא | fence לא סגור: עד סוף הטקסט הוא קוד |
| פרומפט משתמש | `UserMessage` עם עברית | `Text dir="rtl"` | `.catch` מעביר ל-`next(e)` |
| טיוטה בהקלדה | `prompt.change` עם עברית | שורת `AbovePrompt` ב-RTL עם הטיוטה | טיוטה ריקה או בלי עברית: `next(e)` |

</frozen-after-approval>

## Code Map

- `C:\FileExplorer\rtl-hebrew\` -- תיקייה חדשה (לא קיימת), plugin עצמאי.
- `<skill-types>\claude-code.d.ts` (בנתיב ה-skill `plugin-authoring`, נכתב בטעינתו) -- `TextProps.dir` (שורה 14169), `AssistantMessage` (10913), `UserMessage` (10853), `PromptChangeInput`, `RenderComponent` (10383), `MarkdownProps` (6119, אין בו `dir`).
- `<skill>\examples\band.tsx` -- דוגמה ל-hook על `AbovePrompt` עם `atom/read/update`, `<skill>\examples\pane.test.tsx` -- דוגמה לבדיקה עם `claude-code/testing`.
- אין שימוש בקוד של `src/` ב-FileExplorer.

## Tasks & Acceptance

**Execution:**
- [x] `C:\FileExplorer\rtl-hebrew\.claude-plugin\plugin.json`, `hooks\hooks.json` -- מניפסט, `"modules": ["./register.tsx"]`, `types/index.d.ts` ל-`$.state` -- plugin נטען ונבדק
- [x] `hooks\split.ts` -- פונקציה טהורה: מפצלת markdown לקטעי קוד ושורות, ומסמנת שורות עם עברית -- בדיקה ללא engine
- [x] `hooks\register.tsx` -- hooks של `ui.render` על `AssistantMessage` ו-`UserMessage` (עץ Box: שורות עברית ב-`Text dir="rtl"`, השאר `Markdown`), ו-`prompt.change` ו-`AbovePrompt` לשורת המראה
- [x] `hooks\register.test.tsx`, `hooks\split.test.ts` -- בדיקות לכל שורה במטריצה
- [x] `README.md`, `FEASIBILITY.md` -- התקנה בעברית ו-`--plugin-dir`; דוח: שורת הקלט (ממצא מהטיפוסים: אין `dir` לתיבת הקלט, ולכן שורת מראה), וטבלת מצבי הרצה (שיחה, `claude -p`, resume, subagents, `claude agents`) עם סטטוס בדוק או לא נבדק

**Acceptance Criteria:**
- Given תשובה עם שורת עברית, when היא מצוירת, then עץ הציור מכיל `Text` עם `dir="rtl"` לשורה זו בלבד.
- Given בלוק קוד, when מצוירת תשובה, then אין `dir` על הקוד.
- Given טיוטה עם עברית, when `AbovePrompt` מצויר, then נראית שורת מראה, ובלעדיה לא.
- Given הרצה של validate ו-test, when הסתיימו, then שתיהן עוברות.
- Given מצב שלא ניתן לבדוק אוטומטית, when נכתב הדוח, then הוא מסומן "לא נבדק, בדיקה ידנית" ולא "עובד".

## Implementation Notes

- 2026-11-22: ה-Box העוטף של הודעות והטיוטה ברוחב `width="100%"`; כשיש סימן (`●`/`>`) הגוף מקבל `flexGrow={1}` כדי שהשורה תתיישר לקצה הימני. הציור בפועל נבדק ידנית בלבד.
- 2026-11-22: עיצוב inline בשורות עברית כ-`Text` מקונן (קוד בצבע `permission`, הדגשה, נטוי, קישור עם קו תחתון); הסימן `●`/`>` הועבר לימין, אחרי הגוף באותה שורת Box. ציור nested spans ב-rtl בטרמינל נבדק ידנית בלבד.

## Spec Change Log

## Review Triage Log

| # | Finding | Verdict | Route | Evidence |
|---|---------|---------|-------|----------|
| 1 | שורות עברית שהן כותרת, רשימה או ציטוט מציגות סימני markdown גולמיים (`##`, `>`), וטבלאות מתפרקות | medium | patch (שורות); טבלאות: README בלבד | `split.ts` שולח כל שורת עברית ל-`Text` פשוט; הסימנים נראים כפי שנכתבו |
| 2 | `FENCE` לא מזהה `~~~`, גדר ארוכה, סגירה עם info string, או שורה של ```קוד``` | medium | patch | `split.ts` שורות 35 ו-54: כל שורה שמתחילה ב-``` סוגרת |
| 3 | טווח עברית עד U+05FF בלבד | low | patch (תיקון ישיר) | צורות הצגה U+FB1D–FB4F לא מזוהות |
| 4 | אין בדיקה ל-`hasSurvey: true`, ל-`catch`, לטיוטה ריקה, לטיוטה מעורבת, ולגוף ה-fence הלא סגור | medium | patch | Verification Gap: מחיקת `hasSurvey` לא מפילה אף בדיקה |
| 5 | `catch` קורא ל-`next(e)` פעם שנייה אם `next` זרק | low | patch (תיקון ישיר) | `draw` מחזיר `next(e)` גם ב-try וגם ב-catch |
| 6 | עץ העברית מאבד את סימן תחילת התשובה (`isFirstOfReply`) ואת קידומת הפרומפט | medium | patch | העץ מחליף את ציור המנוע כולו; הבחירה: סימן מוצג משמאל כמו במנוע |
| 7 | `prompt.change` בלי `try/catch` לפני `next(e)` | medium | patch | כשל ב-`update` חוסם את `next` בכל הקשה |
| 8 | הטיוטה לא מתאפסת בשליחה | false | - | הטיפוסים של `PromptChangeInput` מגדירים `kind: 'clear'` לריקון בשליחה, ו-`prompt.change` נורה עליו |
| 9 | שורת המראה מתעלמת מ-`maxRows` | low | patch (תיקון ישיר, בכפוף לקיום המאפיין) | טיוטה ארוכה עלולה לגלוש מהרצועה |
| 10 | שורות אנגלית בטיוטה מעורבת מיושרות ימינה | low | reject | נדיר, ותיקון מוסיף מורכבות |
| 11 | קטע `md` של שורות ריקות בלבד | low | reject | פגיעה אסתטית זניחה |
| 12 | אין `tsconfig.json` ולכן `tsc -p` לא רץ כפי שכתוב | low | reject | ה-tsconfig נכתב על ידי המנוע בטעינה; נבדק בחלופה מחוץ לתיקייה. תיקון = עריכת ה-spec |
| 13 | שורות אנגלית בתשובה מעורבת עוברות דרך `Markdown` ולא `next(e)` | low | reject | בלתי נמנע בעיצוב; תיקון = עריכת ה-spec |
| 14 | README עם נתיב קשיח, חסר author/LICENSE, `FEASIBILITY.md` בשורש, `any`, שגיאות בלי לוג, קשר ל-repo | low | reject | הכלי אישי; `validate` עובר; הנתיב ב-`hooks.json` עבר validate |
| 15 | `CRLF` משאיר `\r` בסוף שורות | low | patch (תיקון ישיר) | `split('\n')`; נדרש גם לסגירת גדר קפדנית |

## Design Notes

המנוע מצייר את תשובת Claude מהעץ שה-hook מחזיר, ולכן שורות עברית מאבדות עיצוב markdown פנימי (הדגשה, `קוד` בתוך השורה), והסימונים מוצגים כפי שנכתבו. זו מגבלה ידועה ב-v1, ויש לציין אותה ב-README. פתרון חלופי (הוספת תווי RLM לטקסט שהמנוע מצייר) נפסל כי אינו בר-בדיקה אוטומטית.

## Verification

**Commands:**
- `claude plugin validate C:\FileExplorer\rtl-hebrew` -- expected: עובר ללא שגיאות
- `claude plugin test C:\FileExplorer\rtl-hebrew` -- expected: כל הבדיקות עוברות
- `tsc -p C:\FileExplorer\rtl-hebrew` -- expected: בלי שגיאות טיפוסים
- `git -C C:\FileExplorer\FileExplorer status --short` -- expected: רק תיקיית הבריף וקובץ ה-spec

**Manual checks (if no CLI):**
- הרצת `claude --plugin-dir C:\FileExplorer\rtl-hebrew` ב-Windows Terminal, שאלה בעברית ובדיקה שהשורות מיושרות ימינה (המשתמש בודק).
