# ביקורת יריבה — ARCHITECTURE-SPINE (חיפוש מתקדם)

**שיטה:** לכל ממצא שתי יחידות (סיפורים/מודולים) שנבנות בנפרד, שכל אחת מקיימת כל AD כלשונו, ובכל זאת נבנות באי-תאימות. לכל זוג מוצעת ניסוח AD חדש או מהודק. הקוד שנקרא: `explorerReducer.ts` (`enter()` מאפס `selection`, `entries`, `searchQuery`; `navigate` תמיד דוחף; אפקט הטעינה ואפקט הרחבת העץ ב-`ExplorerContext.tsx` מתעלמים מכל Location שאינו `folder`), `DetailsPane.tsx` (קורא `state.entries` + `state.selection`), `FileList.tsx` ו-`StatusBar.tsx` (קוראים `state.searchQuery`).

## פסק דין

**לא מוכן כבסיס בנייה (needs-work).** הפרדיגמה (מחולל טהור + כותב יחיד) נכונה, אבל ה-spine מגדיר *מי כותב איזה שדה* ולא *מה צורת המצב המשותף* ולא *מי מפעיל מה ומתי*. נמצאו 14 חורים; ארבעה חוסמי-אינטגרציה (F1-F4) יגרמו לשתי יחידות שעומדות ב-AD-ים לשבור זו את זו.

---

## חוסמים

### F1 — אין זהות לריצת סריקה: תוצאות "יתומות" נכנסות לסשן אחר
- **יחידה A (`useSearch`, לולאת הסריקה):** מממשת AD-3 כלשונו: `start` מבטל דרך אותו `AbortController` ו-`return()`, "בתוקף ב-`next()` הבא", ומשגרת `result` לכל תוצאה.
- **יחידה B (`searchReducer`):** מממשת `result` כ-append למערך התוצאות של "הסשן" היחיד (AD-5).
- **התנגשות:** `start('a')` ואז `start('ab')` אחרי 300ms. ל-`next()` של הריצה הישנה יש `await` תלוי בתיקייה, והוא נפתר *אחרי* ש-`start` החדש אפס את הסשן. התוצאה נוספת לסשן של `ab` (AD-3 זורק רק "בעת עצירה", לא בעת החלפה). אותו דבר עם `clearSession` מהעץ (F4): `next()` תלוי מחייה סשן ריק עם תוצאה אחת. לתוצאה אין שדה שקושר אותה לריצה.
- **תיקון — AD-9 (חדש), זהות ריצה:** "`searchReducer` מחזיק `runId: number` שעולה ב-`start` וב-`clearSession`. כל action של הסריקה (`results`, `finished`, `failed`) נושא `runId`; ה-reducer מתעלם מ-action שה-`runId` שלו שונה מהנוכחי. `AbortController` נוצר פר-ריצה וסגור על ה-`runId` שלה. `clearSession` מבטל את הריצה הפעילה (`abort()`), לא רק מנקה."

### F2 — צורת `SearchState` לא מוגדרת: שלושה בעלים ל-`pattern`, שני בעלים לסדר
- AD-6: "`searchReducer` כותב רק תוצאות וסטטוס". אבל חייבים גם: `pattern`, `root`, `runId`, `found` (פס FR-25), `sorted` (FR-16), סיבת `capped`.
- **יחידה A (`SearchBox`):** שומרת `pattern` ב-state מקומי (debounce) וגם ב-`Location.pattern`. **יחידה B (`SearchResults`):** קוראת `location.pattern`. **יחידה C (`useSelectedEntry`):** קוראת `session.root/pattern` לבדיקת "סשן תואם". אין כלל מי מנצח כשהם סותרים (אחרי Back ל-search בלי סשן, או אחרי clear).
- **מיון:** `explorerReducer.sort` הקיים (`name|size|date` + `direction`) מול מתג "מיון לפי קרבה" (FR-16). `searchReducer` "רק תוצאות", אבל מיון פועל על התוצאות. אחת היחידות תכתוב סדר למערך, השנייה תקרא `explorerReducer.sort`, ואי אפשר לחזור לסדר ההגעה.
- **תיקון — AD-10 (חדש), חוזה מצב משותף:** "צורת המצב נקבעת כאן ואין לסטות: `SearchSession = { runId: number; root: FolderRef; pattern: string /* גולמי, trim בלבד */; results: SearchResult[] /* סדר הגעה, לעולם לא ממוין במקום */; status; found: number; sortedByProximity: boolean }`. מיון לפי קרבה הוא דגל ב-`searchReducer` (פעולה `toggleProximitySort`) והרשימה הממוינת נגזרת ב-selector (שוויון: רדוד קודם), לא מועתקת. `Location.pattern` הוא מפתח זהות בלבד. הטקסט בתיבה נגזר מ-`session.pattern` כשהסשן תואם ומ-`location.pattern` אחרת; אין state מקומי של pattern מעבר לטיוטת ה-debounce."

### F3 — מי מפעיל סריקה בכניסה ל-search Location, ואיך זה מתחבר ל-replace
- AD-5: "כניסה ל-`search` בלי סשן תואם מפעילה סריקה חדשה" — לא נאמר *מי*. AD-6: "הפעלה רק דרך `search.start(pattern)`", ו-`start` על search עושה `replace`.
- **יחידה A:** `SearchResults` קורא `start(location.pattern)` ב-`useEffect` ב-mount. **יחידה B:** `SearchProvider` מאזין ל-`location` וקורא `start` כשאין סשן תואם.
- **התנגשות:** הפעלה כפולה; כל `start` עושה `replace` ו-`enter()` שמאפס `selection`; ב-StrictMode האפקט רץ פעמיים ⇒ ריצה נפתחת ונסגרת והסשן מתאפס אחרי תוצאה ראשונה. בנוסף, `start` שנקרא בגלל Back אינו פעולת משתמש ולכן לא אמור לגעת בהיסטוריה, אך AD-5 לא מבדיל.
- **פער replace מול index באמצע ההיסטוריה:** המשתמש עשה Back ל-search (index קטן מהסוף) והקליד חיפוש חדש. `replace` משאיר את ה-forward (תיקיית "מעבר למיקום") שמתייחס לסשן הישן; `push` היה קוטע אותו. לא מוגדר.
- **תיקון — AD-5a (הידוק):** "`SearchProvider` הוא היחיד שמאזין ל-`location`; אפקט יחיד קורא ל-`runSearch(root, pattern)` פנימי כשה-Location הוא `search` ואין סשן תואם. `runSearch` לא נוגע בהיסטוריה. `start(pattern)` (פעולת משתמש) = פעולת היסטוריה + `runSearch`; הפעולה היא `push` מכל Location שאינו `search`, ו-`replace` על search. `replace` קוטע את ה-forward (`history.slice(0, index)`). `SearchResults` לעולם לא מפעיל סריקה. האפקט חסין ל-StrictMode בזכות `runId` (AD-9)."

### F4 — "ניקוי סשן" מפוזר בקריאות UI, וה-debounce עוקף אותו
- AD-6: "לחיצה בעץ מנקה את הסשן במפורש; מעבר למיקום אינו מנקה". הניקוי הוא שתי קריאות מה-UI: `search.clearSession()` + `actions.openFolder()`.
- **יחידה A (`FolderTree`):** קוראת `clearSession` ואז `openFolder`. **יחידה B (`Breadcrumbs`, Up, `Sidebar`, `pickFolder`):** קוראת רק `navigate`, ועומדת ב-AD (רק "לחיצה בעץ" מנקה). התוצאה: ניווט דרך שורת הכתובת משאיר סשן חי שחוזר ב-Back, ואילו הקלקה בעץ מוחקת אותו. אותה כוונה (FR-21), התנהגות שונה.
- **מרוץ סדר:** אם `clearSession` נשלח *לפני* `navigate`, ובין שני ה-dispatch ה-Location עדיין `search` ללא סשן, האפקט של F3 מפעיל סריקה חדשה.
- **מרוץ debounce:** המשתמש הקליד ובתוך 300ms לחץ בעץ. הטיימר יורה אחרי הניווט ו-`start(pattern)` דוחף search חדש עם `root` = התיקייה החדשה. החיפוש "קופץ" חזרה.
- **תיקון — AD-6a (הידוק):** "הניקוי הוא תכונה של הניווט, לא של הכפתור: `goTo(location, { origin: 'user' | 'result' })` ב-`SearchProvider` הוא השער היחיד לניווט שאינו back/forward. `origin: 'result'` (מעבר למיקום) משמר סשן. כל `origin: 'user'` (עץ, breadcrumbs, Up, places, pickFolder) מנקה *ומבטל* ריצה, באטומיות (אותו handler/reducer משולב). כל ניווט, כולל back/forward, מבטל טיימר debounce תלוי. `clearSession` חייב `abort()`."

---

## חורים נוספים (לפי חומרה)

### F5 — search ללא `root` תקף (home/pc/quick)
`Location.search.root: FolderRef`, אבל המיקום הנוכחי יכול להיות `home`/`pc`/`quick` בלי תיקייה. א' משבית את התיבה, ב' מחפש בכל השורשים, ג' זורק. **AD-5b:** "תיבת החיפוש פעילה רק כש-`location.type` הוא `folder` או `search`. `root` של חיפוש חדש = `folder` של ה-Location הנוכחי, או `search.root` כשעומדים על search (לא תיקיית תוצאה שנבחרה). בכל Location אחר התיבה מושבתת."

### F6 — בחירה ו-`enter()`, ומה `useSelectedEntry` קורא
`enter()` מאפס `selection` בכל מעבר היסטוריה, כולל `replace` של כל הקלדה (מוחק תצוגה מקדימה באמצע הקלדה) ו-Back ל-search (מוחק את הפריט שנבחר לפני "מעבר למיקום"). AD-7 קובע ש-`useSelectedEntry()` הוא המקור, אך לא איך הוא בוחר בין `state.entries` ל-`session.results`: א' לפי `location.type`, ב' לפי "סשן תואם". אחרי `navigate select` ל-folder, `entries` עוד ריקות (`loaded` אסינכרוני) ⇒ null והבהוב. `DetailsPane`/`StatusBar`/`FileList` הקיימים קוראים ישירות `state.entries`, `state.selection`, `searchQuery`, ו-AD-7 לא מורה להסב או למחוק אותם. **AD-7a:** "`useSelectedEntry` מחזיר `FileSystemEntry | null | { pending: true }` לפי כלל קבוע: ב-`search` מחפשים id ב-`session.results` (סשן תואם בלבד); אחרת ב-`state.entries`; בחירה קיימת בזמן `status === 'loading'` ⇒ `pending`. `enter()` שומר `selection` כשהמעבר הוא `replace` על search; Back ל-search משחזר את הבחירה האחרונה של אותו Location (נשמרת ברשומת ההיסטוריה). השדה `searchQuery`, `typeFilter` על search והפעולה `search` נמחקים באותו צעד שבו `FileList`/`StatusBar`/`DetailsPane` מוסבים."

### F7 — השהיה/ריצה פעילה + ניווט
AD-6: מעבר למיקום לא מנקה; AD-3: השהיה = לא קוראים `next()`. לא נקבע מה קורה לריצה *פעילה* כשיוצאים מ-search ל-folder. א' (provider) ממשיך לסרוק ולשגר (בזבוז, `capped` אחרי היציאה, פס התקדמות בלתי נראה); ב' (`SearchResults` ב-unmount) משהה. ב-Back המשתמש רואה סטטוס שונה לפי היחידה. **AD-3a:** "יציאה מ-search Location (מכל סיבה, כולל 'מעבר למיקום') ממירה `scanning` ל-`paused`. חזרה אליו אינה ממשיכה אוטומטית; המשתמש לוחץ המשך (FR-24). `done|capped|stopped` נשארים. מחוץ ל-search התיבה מציגה את `session.pattern` והכפתורים (FR-9) מוסתרים."

### F8 — עצירה/המשך: מעברי מצבים חסרים ותוצאות בטיסה
הדיאגרמה: `stopped → scanning` רק דרך `start`; אין `resume` מ-`stopped`, אך FR-24 מתיר "עצירה בהשהיה". AD-3 מחייב `return()` בעצירה, כך שהמחולל נהרס. תוצאות בטיסה: בהשהיה, תוצאת תיקייה שכבר נקראה (בתוך `next()` תלוי) נזרקת (א', לפי "נזרקות בעצירה") או נשמרת (ב') ⇒ המשך מאבד או מכפיל תיקייה. `capped` + תוצאה בטיסה: האם ה-N כולל אותה. **AD-3b:** "השהיה אינה מפילה תוצאות: תוצאה מ-`next()` שהיה בטיסה נקלטת ואז הצרכן מפסיק. זריקה חלה רק על עצירה ועל החלפת ריצה (AD-9). המחולל חי כל עוד `paused`; `stopped|capped|done|failed` מסיימים אותו ואינם ניתנים להמשך (ה-UI לא מציג המשך). הצרכן מקבל לכל היותר `500 - found` תוצאות."

### F9 — צורת `SearchResult` מול `FileSystemEntry`, ו"מעבר למיקום" לתיקייה
בתיקייה `entry.id === entry.folder.id`; בקובץ אין `folder`. "מעבר למיקום" לקובץ = `navigate(parent, select: entry.id)`. לתיקייה: א' מנווט ל-`parent` ומסמן, ב' נכנס לתיקייה. לא נקבע. `select` נשלח לפני ש-`entries` נטענו, ו-`enter()` מאפס בחירה; אין כלל למקרה שהפריט נמחק מהדיסק. **AD-7b:** "מעבר למיקום תמיד אל `result.parent` עם `select: result.entry.id`, גם לתיקייה. `select` שלא נמצא ב-`loaded` מתבטל בשקט. `SearchResult.parent` הוא ה-`FolderRef` האמיתי מהסריקה, לא משוחזר מ-id."

### F10 — זהות חיפוש על `pattern` גולמי
`sameLocation(search, search)` משווה `root.id` ו-`pattern`. `ab` מול `ab ` (רווח) הם Location שונים וסשן זהה; א' מנרמל, ב' לא. **AD-4a:** "מפתח זהות של חיפוש = `normalizePattern(raw)` (trim; ללא שינוי רישיות) המוגדר ב-`utils/pattern.ts` בלבד. `sameLocation` ו'סשן תואם' משתמשים בו. דפוס ריק = אין חיפוש (F11)."

### F11 — ניקוי תיבה (FR-21) מול היסטוריה
"חוזר למיקום הנוכחי": א' `back` (יוצא למקום הלא נכון אם נכנסו מ-Back/forward), ב' `replace` ל-`folder(root)`, ג' `push`. הסשן נשאר או נמחק? **AD-5c:** "ניקוי תיבה = `replace` של ה-Location הנוכחי ב-`folder(search.root)` + `clearSession` (כמו `origin: 'user'`). לעולם לא `back`."

### F12 — צרכני Location שאינם מכירים search
`up` ב-`ExplorerContext` חוזר מוקדם כשהמיקום אינו `folder` (Up מת על search). `Breadcrumbs`, `refresh` (מאפס בחירה אך לא סורק מחדש), ואפקט הרחבת העץ (לא מסונכרן ל-search root) לא מכירים את הסוג החדש. **AD-5d:** "טבלת התנהגות לכל צרכן Location: Breadcrumbs מציג `search.root` + תג חיפוש; `up` מ-search = `folder(search.root)` (`origin: 'user'`); `refresh` מ-search = `runSearch` חדש מאותו root/pattern; העץ מסמן ומרחיב לפי `search.root`. כל `switch` על `Location['type']` ב-`src/components` ו-`src/state` הוא exhaustive (`never`), כדי שהרחבת האיחוד תיכשל בקומפילציה בכל צרכן."

### F13 — dispatch לכל תוצאה מול צרכנים
ה-`[ASSUMPTION]` ב-Deferred: dispatch לכל תוצאה. א' ישגר אחד-אחד, ב' יצפה לאצווה; כל dispatch מרנדר את כל צרכני ה-Context (כולל `DetailsPane`). **AD-8a:** "הצרכן אוסף ומשגר `results: SearchResult[]` אחת ל-50ms או בסוף תיקייה; ה-reducer מקבל תמיד מערך; `found` נגזר מ-`results.length`."

### F14 — כישלון בשורש ושגיאות שאינן permission/not-found
AD-8 מדלג בשקט על `permission`/`not-found` לכל תיקייה. אם `root` עצמו נכשל (הוסר/פקעה הרשאה) התוצאה היא "לא נמצאו תוצאות" (FR-23) במקום שגיאה. שגיאה מסוג אחר נזרקת מהמחולל ואין מי שתופס: הסטטוס נתקע ב-`scanning`. **AD-8b:** "כישלון בשורש = סטטוס `failed` עם הודעה (לא דילוג). כל חריגה אחרת מהמחולל נתפסת בצרכן וממירה ל-`failed`; `failed` נכלל במכונת המצבים ומאפשר `start`."

---

## סיכום הצעות AD

| חדש/הידוק | נושא | סוגר |
| --- | --- | --- |
| AD-9 | `runId` לכל ריצה | F1 |
| AD-10 | צורת `SearchSession` + מיון כדגל | F2 |
| AD-5a/5b/5c/5d | מפעיל יחיד לסריקה, שורש, ניקוי תיבה, צרכני Location | F3, F5, F11, F12 |
| AD-6a | ניקוי = תכונת הניווט, אטומי, מבטל debounce | F4 |
| AD-7a/7b | `useSelectedEntry`, בחירה ב-`enter`, מעבר למיקום | F6, F9 |
| AD-3a/3b | יציאה = השהיה; השהיה לא מפילה תוצאות | F7, F8 |
| AD-4a | `normalizePattern` יחיד | F10 |
| AD-8a/8b | אצוות, כישלון שורש | F13, F14 |
