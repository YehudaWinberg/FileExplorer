---
id: SPEC-check-on-stop-hook
companions: [decision-table.md]
sources: [../../planning-artifacts/briefs/brief-FileExplorer-2026-11-15-stop-hook/brief.md]
---

> **Canonical contract.** This SPEC and the files in `companions:` are the complete, preservation-validated contract for what to build, test, and validate. Source documents listed in frontmatter are for traceability — consult them only if you need narrative rationale or prose color this contract intentionally omits.

# Stop hook שמאמת npm run check

## Why

מנדט פנימי (תרגיל Harness Engineering, Level 6): הכלל ב-`AGENTS.md` "משימה לא גמורה כשה-check נכשל" תלוי בכך שהסוכן יזכור אותו. הסוכן והמשתמש נפגעים: משימה נסגרת עם check אדום. אכיפה אוטומטית חייבת גם לא להריץ check סתם, ולא ליצור לולאת חסימה על כשל שהסוכן לא יכול לתקן.

## Capabilities

- **CAP-1**
  - **intent:** המערכת מדלגת על ה-check כשלא שונה קוד תחת `src/`.
  - **success:** בלי שינוי תחת `src/`, ה-hook מאפשר סיום ו-`npm run check` לא מורץ (נבדק בבדיקה).
- **CAP-2**
  - **intent:** כשיש שינוי תחת `src/` וה-check עובר, הסוכן מסיים בלי הפרעה.
  - **success:** check ירוק => סיום מותר, ללא חסימה.
- **CAP-3**
  - **intent:** כשל check שהסוכן יכול לתקן (`tsc`, lint, בדיקה שנכשלה) חוסם את הסיום ומחזיר לסוכן את הכשל.
  - **success:** הפלט הוא `decision: "block"` עם `reason` בעברית הכולל את סוף פלט ה-check; ה-`reason` מציין שזה ניסיון התיקון היחיד ושאם אי אפשר לתקן יש לדווח על הכשל.
- **CAP-4**
  - **intent:** כשל סביבתי או לא ברור אינו חוסם, והמשתמש מקבל דיווח גלוי.
  - **success:** `node_modules` חסר, `ENOENT`, שגיאת רשת/הרשאות, timeout, כשל לא מסווג, קלט stdin פגום וקריסת ה-hook מובילים כולם לאישור סיום עם `systemMessage` שמפרט את הכשל.
- **CAP-5**
  - **intent:** הסוכן מקבל ניסיון תיקון אחד בלבד; אחריו ה-hook עוצר.
  - **success:** כש-`stop_hook_active` הוא `true` וה-check עדיין נכשל, הסיום מותר עם `systemMessage` על הכשל ואין חסימה שנייה. אין מצב בין הרצות (ללא קובץ מונה).
- **CAP-6**
  - **intent:** הלוגיקה ניתנת לבדיקה בנפרד מהאדפטר, כמו ב-hooks הקיימים.
  - **success:** יש לוגיקה טהורה, אדפטר דק ובדיקות `node:test` לכל ענף ב-[decision-table.md](decision-table.md), ו-`npm run check` עובר.

## Constraints

- Fail open: כל כשל, כולל קריסת ה-hook, מאשר סיום. הפוך מ-`file-guard` (fail closed), כי לולאה גרועה מ-check אדום מדווח.
- `npm run check` מוגבל ל-timeout של 2 דקות; הרישום ב-`settings.json` כולל `timeout` של 120 שניות.
- זיהוי שינוי: `git status --porcelain -- src` (כולל קבצים חדשים שלא נעקבו). קבצים שנעשה להם commit לא נספרים.
- ההבחנה בין חסימה ראשונה לניסיון חוזר נעשית רק לפי השדה `stop_hook_active` שב-stdin; אין קובץ מונה ואין מצב נשמר.
- סיווג כשל לפי מילות מפתח וקוד יציאה בלבד (ראו [decision-table.md](decision-table.md)); מה שלא מזוהה כ-`tsc`/lint/בדיקה אינו חוסם. כשל מעורב (סביבתי + `tsc`) נחשב סביבתי.
- הקוד יושב ב-`.claude/hooks/check-on-stop/`; אין שינוי ב-`src/`.
- הרישום ב-`.claude/settings.json` נעשה ידנית בידי המשתמש, כי `file-guard` חוסם עריכת הקובץ.
- ה-hook לא יכול לכפות דיווח בהודעה האחרונה של הסוכן; רק לבקש ב-`reason` ולהציג `systemMessage`.
- אין commit, push או PR.

## Non-goals

- סיווג חכם של כשלים (למידה, ניתוח סמנטי).
- תיקון אוטומטי של כשלים בידי ה-hook.
- שינוי כלשהו ב-`src/`.
- רישום אוטומטי של ה-hook ב-`settings.json`.
- הרחבות עתידיות: למידה מהיסטוריית ריצות, דיווח כשלים לקובץ קבוע, כלי check נוספים.

## Success signal

בשיחה אמיתית: שינוי ב-`src/` שמשבר טיפוס חוסם את הסיום פעם אחת לכל היותר ואז משחרר עם דיווח גלוי; check ירוק מסיים מיד; שיחה בלי שינוי ב-`src/` לא מריצה check; ובשום תרחיש, כולל קלט פגום, אין לולאה אינסופית.

## Assumptions

- זיהוי שינוי דרך `git status` מקובל, והמגבלה לגבי קבצים שנעשה להם commit מתיישבת עם מדיניות "אין commit בלי בקשה".
- `stop_hook_active` מגיע ב-stdin בכל הרצה שאחרי חסימה, ולכן מספיק כדי לעצור אחרי ניסיון אחד.
