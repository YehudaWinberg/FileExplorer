---
id: SPEC-file-explorer-mcp
companions: []
sources: []
---

> **Canonical contract.** This SPEC and the files in `companions:` are the complete, preservation-validated contract for what to build, test, and validate. Source documents listed in frontmatter are for traceability — consult them only if you need narrative rationale or prose color this contract intentionally omits.

# שרת MCP לקריאה בלבד על FileExplorer

## Why

משימת קורס (קידוד עם AI): לתת ל-Claude דלת צרה ומיועדת אל הפרויקט במקום גישה רחבה. יהודה בונה שרת MCP קטן שחושף tool, resource ו-prompt, כולם לקריאה בלבד, כדי להבין מי מפעיל כל אחד מהם ולהוכיח זאת בסשן אחד. מקרה השימוש שנבחר: מעקב אחר קבצים ותלויות שהשתנו לאחרונה, לצורך אבטחת מידע.

## Capabilities

- **CAP-1**
  - **intent:** Claude יכול לברר אילו קבצים בפרויקט שונו בשעות האחרונות, עם סינון לפי סוג וגודל ותת-תיקייה, וזאת מבלי לצאת משורש קבוע.
  - **success:** tool בשם `recent_changes` מקבל `hours` (שלם 1 עד 720, חובה), `type` (`xml` / `word` / `excel` / `image`, רשות), `minSizeMB` (מספר חיובי, רשות) ו-`subfolder` (יחסי לשורש, רשות), ומחזיר רשימת קבצים עם תאריך שינוי. Claude קורא לו מעצמו על שאלה כמו "מה השתנה ב-3 הימים האחרונים?". קלט שאינו תואם לסכמה נדחה.
- **CAP-2**
  - **intent:** המשתמש יכול לצרף לשיחה, בכתיבת `@`, תוכן קבוע ומתוכנן מראש שהשרת מציע.
  - **success:** resource אחד, `changes://last-3-days`, מופיע ברשימת ה-`@` של Claude Code, ובחירתו מכניסה לשיחה רשימת הקבצים ששונו ב-3 הימים האחרונים בתוך השורש. התוכן אינו כולל סודות.
- **CAP-3**
  - **intent:** המשתמש יכול להריץ בפקודת סלאש בדיקה מוכנה של שינויים אחרונים, בלי לנסח את הבקשה מחדש.
  - **success:** prompt קבוע מופיע כ-`/mcp__fileChange__<שם-prompt>` עם שלושה פרמטרים (`days`, `type`, `size`) והנוסח "חפש לי קבצים שהשתנו ב-{days} הימים האחרונים מסוג {type} בגודל {size}". Claude ממיר את הערכים (ימים לשעות, גודל ל-MB) וקורא ל-`recent_changes`.
- **CAP-4**
  - **intent:** הפרויקט רושם את השרת כך ש-Claude Code מתחבר אליו אוטומטית.
  - **success:** `.mcp.json` בשורש הפרויקט מגדיר את השרת `fileChange` (stdio) עם הגדרה אחת `FE_ROOT` הנקראת ממשתנה סביבה, וברירת המחדל שלה `src/`; `/mcp` מציג Connected; `claude mcp get fileChange` מציג scope של project.

## Constraints

- הכול לקריאה בלבד: השרת לא כותב, לא מוחק, לא משנה שמות ולא שומר מצב בין הרצות. לכן אין "מאז השימוש האחרון"; מקומו תפס הפרמטר `hours`.
- השורש מגיע ממשתנה הסביבה `FE_ROOT` (עם ברירת מחדל) ולא מפרמטר של הכלי. Claude לא קובע אותו.
- `subfolder` חייב להישאר בתוך השורש לאחר פתרון הנתיב המלא, כולל `..` וקיצורי דרך (symlinks). נתיב שיוצא מהשורש נדחה.
- אימות קלט נעשה בסכמת zod של ה-SDK, לא בבדיקות ידניות בקוד.
- תעבורת stdio: ה-stdout שמור לפרוטוקול; כל לוג נכתב ל-stderr.
- אין סודות ב-`.mcp.json`.
- נתיבי ה-SDK הם של גרסה 1.x (`@modelcontextprotocol/sdk/...`) ואין לערבב עם נתיבי גרסה 2.x.
- תלויות חדשות מותרות: `@modelcontextprotocol/sdk` ו-`zod` בלבד.
- העבודה נשארת על הענף `feat/level-5` (החלטה של יהודה). אפליקציית ה-Web של ה-FileExplorer וההתנהגות הקיימת שלה אינן משתנות; `npm run check` חייב לעבור.
- כללי הטיפול בנתיבים ב-`.claude/rules/lib-operations.md` חלים: אימות נתיבים, טיפול בקובץ חסר ובשגיאת הרשאה, ללא נתיבים קשיחים.

## Non-goals

- כתיבה, מחיקה או שינוי של קבצים בכל צורה.
- זיכרון בין הרצות (למשל "מאז הפעם האחרונה שהשתמשתי").
- יותר מ-resource אחד, ו-resource שמריץ חיפוש (חיפוש הוא עבודת ה-tool).
- שורש כפרמטר של הכלי.
- זיהוי של איזו ספרייה נוספה בתוך `package.json`; הכלי מדווח רק שהקובץ השתנה.
- שינוי באפליקציית ה-FileExplorer עצמה, קריאות רשת או Backend.

## Success signal

בסשן אחד של Claude Code: `/mcp` מראה את השרת Connected; Claude קורא ל-`recent_changes` בעצמו; יהודה מצרף את ה-resource ב-`@` ומריץ את ה-prompt כ-`/mcp__…`; ושליחת קלט שגוי (למשל `hours` שאינו מספר) נדחית על ידי הסכמה. `claude mcp get` מציג scope של project.

## Assumptions

- קוד השרת יושב ב-`mcp/fileChange/`; בתיקיית `mcp/` תהיה תיקייה נפרדת לכל שרת עתידי.
- ארגומנטים של prompt ב-MCP הם מחרוזות; Claude ממיר אותם לערכי הסכמה של ה-tool.
- מנהל החבילות בפרויקט הוא npm ולא NuGet; רעיון מעקב התלויות זהה.
- "הקבצים ששונו" נקבעים לפי זמן שינוי (mtime) של הקובץ.
- `type` ממופה לסיומות: `xml` ל-`.xml`, `word` ל-`.doc`/`.docx`, `excel` ל-`.xls`/`.xlsx`, `image` לסיומות תמונה נפוצות.

## Open Questions

- מה יהיה שם ה-prompt (למשל `recent-files`)?
- שתי הוריאציות שיהודה הציע (קבצי Word ביומיים האחרונים; קבצים מעל 2MB ביום האחרון) נבנות כקריאות tool: `type=word` עם `hours=48`, ו-`hours=24` עם `minSizeMB=2`. אם יהודה רוצה אותן כ-resources נוספים, זה חורג מהמשימה (resource אחד).
