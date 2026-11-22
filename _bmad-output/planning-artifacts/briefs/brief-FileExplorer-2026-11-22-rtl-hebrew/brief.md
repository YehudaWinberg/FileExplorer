---
title: "Product Brief: rtl-hebrew (Mod ל-Claude Code)"
status: draft
created: 2026-11-22
updated: 2026-11-22
---

# Product Brief: rtl-hebrew

ענף עבודה: `feat/right-to-left-hebrew` · מיועד למימוש: Amelia (`bmad-agent-dev`)

## Executive Summary

Mod ל-Claude Code שמצייר שורות בעברית מימין לשמאל, בשיחה בטרמינל. ה-extension של VS Code כבר נותן את זה, והטרמינל לא. כשעובדים בטרמינל, עברית מעורבת באנגלית (שמות קבצים, פונקציות, מונחים) מתהפכת ומתיישרת לשמאל, וקשה לקרוא אותה.

ה-API של ה-Mods חושף שני דברים שמספיקים לכך (נבדק ב-`claude-code.d.ts`): hook מסוג `ui.render` על `AssistantMessage` ועל `UserMessage`, ומאפיין `dir: 'rtl'` על `Text`.

## The Problem

- משתמש עברית שעובד בטרמינל קורא תשובות של Claude שמיושרות שמאלה, עם סדר מילים שבור בשורות מעורבות.
- בעבודה שוטפת (בריפים, הסברים) זה מאט את הקריאה ומעלה טעויות.
- הפתרון היום הוא לעבור ל-extension, וזה לא תמיד אפשרי (הרצה ב-CLI, ריצה ללא השגחה).

## The Solution

Mod בשם `rtl-hebrew` עם שני hooks:

1. `ui.render` על `AssistantMessage`: אם בשורה יש עברית, היא מצוירת ב-`Text dir="rtl"`.
2. `ui.render` על `UserMessage`: אותו דבר לפרומפט שהמשתמש כתב.

שורה בלי עברית ובלוקי קוד (` ``` `) לא נוגעים: עוברים דרך `next(e)` ונשארים LTR.

## What Makes This Different

אין כאן חפיר תחרותי. זה שימוש ביכולת מובנית של ה-API, והיתרון הוא קטן וממוקד: Mod אחד, ללא תלויות, שרץ בתוך Claude Code ולא כשכבה חיצונית שמיירטת פלט טרמינל.

## Who This Serves

משתמש יחיד, yehuda, שעובד בעברית ובאנגלית בטרמינל של Claude Code על Windows 11. [ASSUMPTION] הכלי אישי ולא מיועד לפרסום.

## Success Criteria

- שורת עברית בתשובה של Claude מיושרת לימין ונקראת בסדר נכון, כולל שורה שנפתחת במילה לטינית או במספר.
- בלוקי קוד, נתיבים ופקודות נשארים קריאים ולא מתהפכים.
- `claude plugin validate` עובר, ו-`claude plugin test` עובר עם בדיקות ל-hooks.
- שורת הקלט קוראת עברית נכון בזמן הקלדה (או דוח מנומק שזה לא אפשרי, אחרי בדיקת ההיתכנות).
- טבלה מתועדת: לכל מצב הרצה (כולל `claude agents`), האם ה-Mod נטען והאם הוא עובד.
- בדיקה ידנית ב-Windows Terminal אחרי טעינת ה-Mod (ראו "לא ידוע").

## Scope

**בפנים (דרישות מהמשתמש, 2026-11-22):**
- Mod אחד, `AssistantMessage` ו-`UserMessage`, זיהוי עברית לפי שורה, החרגת בלוקי קוד.
- **שורת הקלט (composer) חייבת לקרוא עברית נכון בזמן הקלדה.** זו דרישת חובה, לא "יתרון נוסף". ראו "בדיקת היתכנות" למטה.
- **הפעלה בכל מצבי ההרצה של הטרמינל**, למשל `claude agents`, לא רק בשיחה הרגילה. צריך לבדוק באילו מצבים Mods נטענים בכלל ואיפה `ui.render` מצויר.

**בחוץ:**
- שינוי של Windows Terminal או של טרמינל אחר.
- שינוי קבצי הפרויקט `src/`.

**מיקום ואריזה (דרישה, 2026-11-22):** ה-Mod יושב **בתיקייה נפרדת משלו, מחוץ לפרויקט FileExplorer**, כדי שאפשר יהיה להעביר אותו הלאה כ-plugin. [ASSUMPTION] נתיב מוצע: `C:\FileExplorer\rtl-hebrew\` (תיקייה אחות של `FileExplorer`), ואמיליה מאשרת מולך לפני יצירה.
- מבנה plugin תקני: `.claude-plugin/plugin.json`, `hooks/hooks.json`, `hooks/register.tsx`, ובמידת הצורך `types/index.d.ts`.
- `README.md` קצר בעברית עם הוראות התקנה. לשיתוף דרך GitHub: `.claude-plugin/marketplace.json` והפקודה `/plugin install rtl-hebrew --marketplace <owner>/<repo>` (לפי `reference.md` של ה-skill; רק כשהמשתמש מבקש).
- לפיתוח: הרצה עם `--plugin-dir` על התיקייה הנפרדת, כדי שלא תהיה תלות ב-`~\.claude\dev-mods\`.
- הבריף והענף `feat/right-to-left-hebrew` נשארים ב-FileExplorer כתיעוד בלבד.

## בדיקת היתכנות (שלב 0, לפני מימוש)

**מה נבדק בטיפוסים (`claude-code.d.ts`):**
- רשימת הרכיבים ש-`ui.render` מצייר היא: `AskUserQuestion`, `UserMessage`, `AssistantMessage`, `ToolUse`, `ToolResult`, `ToolGroup`, `ToolProgress`, `CommandOutput`, `Spinner`, `TurnDuration`, `InfoNotice`, `SessionMode`, `PromptHint`, `AbovePrompt`, `AbovePromptList`, `Pane`, `Placed`, `Backdrop`. **אין בה את תיבת הקלט עצמה.**
- לתיבת הקלט יש hooks אחרים: `prompt.edit`, `prompt.change`, `prompt.fill`, `prompt.read`. הם קוראים וכותבים את הטקסט ומאפשרים `decorations` (צבע, הדגשה, קו תחתון), ואין להם כיוון קריאה (`dir`).
- המסקנה: **אין ב-API כיום דרך מתועדת להפוך את כיוון הקריאה של שורת הקלט.**

**כיווני פתרון לבדיקה (אמיליה, לפי סדר):**
1. טריק Unicode: להוסיף תווי כיוון (RLM או RLE/PDF) לטקסט הטיוטה ב-`prompt.edit`. סיכון: התווים יישלחו ל-Claude כחלק מהפרומפט. כדי לנטרל, להסיר אותם ב-`prompt.submit`. צריך לבדוק מה קורה לסמן ולמחיקה.
2. תצוגה מקבילה: שורה מעל הפרומפט (`AbovePrompt`) שמציגה את הטיוטה בסדר RTL נכון בזמן ההקלדה, והקלט עצמו נשאר כמו שהוא.
3. אם שניהם נכשלים: לדווח בבירור שזה לא אפשרי היום, ולהציע תיקון בצד של Claude Code עצמו (בקשת פיצ'ר).

**החלטה (המשתמש, 2026-11-22):** מתחילים מחלק השיחה (`AssistantMessage`, `UserMessage`). אם בדיקת ההיתכנות של הקלט נכשלת, ממשיכים עם השיחה ומדווחים על הקלט כפער פתוח, בלי לעצור.

**מצבי הרצה (`claude agents` ואחרים):**
- Mods הם plugins ונטענים לפי session. לא נבדק אם `claude agents` (תצוגת הסוכנים) טוענת plugins ומציירת `ui.render`, או שהיא מסך נפרד בלי Mods.
- לבדוק גם: שיחה רגילה, `claude -p` (אין שם transcript), resume, ו-subagents. לתעד לכל מצב: נטען או לא, מצויר RTL או לא.

## מגבלות ושאלות פתוחות (לא ידוע)

- לא נבדק איך Windows Terminal מציג את התוצאה. לפי התיעוד, טרמינל שמסדר טקסט בעצמו יצייר את ה-Text כאילו אין `dir`, כך שהתוצאה עלולה להיות זהה למצב בלי ה-Mod.
- עיבוד markdown: רשימות, כותרות וטבלאות בתוך `AssistantMessage.text` (הטקסט מגיע כ-markdown). צריך להחליט אם מציירים אותו מחדש בעצמנו או משנים רק את `dir`.
- ה-Mod נטען רק אחרי אישור של "Turn on the mods Claude writes in this session?".

## Vision

אם זה עובד, אפשר להוסיף מתג להפעלה והשבתה, ולבדוק אם גם שורת הקלט נתמכת בגרסאות עתידיות של ה-API.

## הנחיות לאמיליה

- לקרוא את ה-skill `plugin-authoring` ואת הטיפוסים לפני כתיבה: `Text.dir`, `AssistantMessage`, `UserMessage`.
- לעבוד על הענף `feat/right-to-left-hebrew`. **בלי commit, push או PR** אלא אם המשתמש מבקש במפורש במשימה.
- לאמת עם `claude plugin validate` ועם `claude plugin test`, ולדווח בעברית מה נבדק ומה לא.
