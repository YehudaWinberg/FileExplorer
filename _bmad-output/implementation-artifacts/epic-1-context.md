# Epic 1 Context: מציאת קובץ בתתי-תיקיות

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

המשתמש מקליד דפוס (שם, סיומת, `*`, `?`) בתיבת חיפוש בשורת הכתובת ורואה תוצאות מכל העץ בהדרגה, מהקרוב לעמוק, במסך תוצאות בן שלוש עמודות. אפשר לעצור סריקה, לבטל אותה בהקלדה חדשה או לצאת ממנה בלחיצה על תיקייה בעץ.

## Stories

- Story 1.1: מנוע התאמת דפוסים
- Story 1.2: סריקת עץ בהדרגה
- Story 1.3: מצב חיפוש, סשן והפעלה
- Story 1.4: מסך תוצאות
- Story 1.5: תיבת חיפוש בשורת הכתובת
- Story 1.6: יציאה מחיפוש ואי-שבירה

## Requirements & Constraints

- התאמת "מכיל" לפי חלק מהשם; `*` = כל רצף (גם ריק), `?` = תו בודד; ללא רגישות לרישיות.
- דפוס `*.xxx` / `שם*.xxx`: חלק השם "מכיל", הסיומת מדויקת; כשיש סיומת תיקיות אינן תוצאה, בלעדיה גם תיקיות וגם קבצים. `.pdf` לבדו = תבנית שם.
- סריקה לעומק מהמיקום הנוכחי; תיקיות ללא הרשאה מדולגות בשקט; `node_modules` ו-`.git` מדולגות (רשימה מצומצמת ומתועדת).
- אפליקציה לקריאה בלבד: אין כתיבה, מחיקה, שינוי שם או רשת. Chrome/Edge בלבד.
- חיפוש שם פשוט ממשיך לעבוד כמו היום; `npm run check` חייב לעבור; בלי ספריות חדשות.
- בדיקות יחידה חייבות להוכיח את `report.pdf`, `*.pdf`, `re*ort`.

## Technical Decisions

- `src/lib/utils/pattern.ts`: `compilePattern(raw)` → `{ nameRe, extension|null, fixedChars }` עם בריחה לכל תו שאינו `*`/`?`; `scoreMatch(compiled, entry, depth)` → `number|null`, שלם 0..95.
- `nameSearch.ts` הישן ופעולת reducer `search` נמחקים רק בסיפורים מאוחרים; אין סינון מיידי בזמן debounce.
- `scanTree(adapter, root, compiled, signal)` כ-`AsyncGenerator<SearchResult>` ב-`src/lib/scanTree.ts`, BFS לפי רמות; `listNames(folder)` קריאה-בלבד ב-`fileSystem.ts`.
- `Location` מורחב ב-`{ type: 'search', root, pattern }`; `searchReducer` נפרד כותב רק `SearchSession`; `runId` מונע תוצאות מסריקה ישנה.
- קונבנציות: בדיקות `*.test.ts` לצד הקוד; `id` של פריט = `parent.id/name`; שגיאות כ-`FsError`.

## Cross-Story Dependencies

- 1.1 (pattern) הוא תשתית ל-1.2 (סריקה) ול-3.x (קרבה).
- 1.2 נשען על 1.1; 1.3 על 1.2; 1.4–1.6 על 1.3.
