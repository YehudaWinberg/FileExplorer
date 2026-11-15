# Decision table — check-on-stop

סדר הערכה: שורה ראשונה שמתאימה קובעת. אין מצב נשמר; ההבחנה בין חסימה ראשונה לניסיון חוזר היא לפי `stop_hook_active` ב-stdin.

| # | תנאי | פעולה | CAP |
|---|------|-------|-----|
| 1 | קלט stdin פגום / ה-hook קרס | מאפשר סיום + `systemMessage` | CAP-4 |
| 2 | אין שינוי תחת `src/` (`git status --porcelain -- src` ריק) | מאפשר סיום, `check` לא רץ | CAP-1 |
| 3 | `check` עבר (exit 0) | מאפשר סיום | CAP-2 |
| 4 | timeout (2 דקות) | מאפשר סיום + `systemMessage` | CAP-4 |
| 5 | כשל סביבתי או לא מסווג | מאפשר סיום + `systemMessage` עם הפירוט | CAP-4 |
| 6 | כשל תלוי-סוכן, `stop_hook_active` שאינו `true` | `decision: "block"` + `reason` בעברית עם סוף הפלט, מציין שזה ניסיון התיקון היחיד | CAP-3 |
| 7 | כשל תלוי-סוכן, `stop_hook_active` הוא `true` | מאפשר סיום + `systemMessage` עם הכשל | CAP-5 |

## סיווג כשל

- **תלוי-סוכן:** פלט מזוהה כשגיאת `tsc`, lint או בדיקה שנכשלה.
- **סביבתי:** `ENOENT`, `Cannot find module`, `EACCES`, `ETIMEDOUT`, `command not found`, `node_modules` חסר, או קוד יציאה לא צפוי.
- **לא ברור:** כל השאר. מטופל כסביבתי (לא חוסם).
- כשפלט מכיל גם סימן סביבתי וגם סימן תלוי-סוכן, סביבתי גובר (fail open).
