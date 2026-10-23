---
name: FileExplorer
description: סייר קבצים בסגנון Windows 11 (Fluent), עברית RTL, מצב בהיר בלבד. המסמך מרחיב את src/styles/tokens.css לחיפוש מתקדם - שורה עליונה משולבת, חיווי סריקה, שורת תוצאה עם טבעת קרבה וחלונית תצוגה מקדימה.
status: final
updated: 2026-10-23
sources:
  - _bmad-output/planning-artifacts/briefs/brief-FileExplorer-2026-10-23/brief.md
  - _bmad-output/planning-artifacts/prds/prd-FileExplorer-2026-10-23/prd.md
colors:
  # טוקנים קיימים (src/styles/tokens.css, מצב בהיר). לא ממציאים מחדש.
  bg-mica: '#f3f3f3'
  bg-layer: '#ffffff'
  bg-hover: 'rgba(0, 0, 0, 0.045)'
  bg-pressed: 'rgba(0, 0, 0, 0.07)'
  bg-selected: '#cce8ff'
  bg-selected-inactive: '#e5f3ff'
  border: '#e0e0e0'
  border-strong: '#c8c8c8'
  text: '#1a1a1a'
  text-secondary: '#5d5d5d'
  text-disabled: '#a0a0a0'
  accent: '#0067c0'
  accent-hover: '#1975c5'
  accent-text: '#ffffff'
  danger-bg: '#fde7e9'
  danger-text: '#a4262c'
  # הרחבות חדשות לחיפוש (מקור: .working/directions-toolbar-1.html וריאציה B, key-search-results-1.html)
  scan-progress: '#0067c0'
  paused: '#c27a00'
  paused-bg: '#fff8ec'
  paused-text: '#7a4b00'
  field-underline: '#8d8d8d'
  row-hover: '#f5f5f5'
  result-selected: '#e6f0fa'
  ring-track: '#e0e0e0'
  ring-fill: '#0067c0'
  details-bg: '#fcfcfc'
  divider-vertical: '#d0d0d0'
  row-divider: '#f0f0f0'
  file-type-pdf: '#b3261e'
typography:
  body:
    fontFamily: "'Segoe UI Variable Text', 'Segoe UI', system-ui, sans-serif"
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.4'
  title:
    fontFamily: "'Segoe UI Variable Text', 'Segoe UI', system-ui, sans-serif"
    fontSize: 16px
    fontWeight: '600'
  small:
    fontFamily: "'Segoe UI Variable Text', 'Segoe UI', system-ui, sans-serif"
    fontSize: 12px
    fontWeight: '400'
  path:
    fontFamily: "'Segoe UI Variable Text', 'Segoe UI', system-ui, sans-serif"
    fontSize: 13px
    fontWeight: '400'
  badge:
    fontFamily: "'Segoe UI Variable Text', 'Segoe UI', system-ui, sans-serif"
    fontSize: 10px
    fontWeight: '400'
    lineHeight: 12px
rounded:
  DEFAULT: 4px
  lg: 8px
  badge: 8px
spacing:
  sm: 6px
  gutter: 8px
  md: 12px
  row-height: 30px
  toolbar-height: 44px
  field-height: 32px
  result-row-height: 52px
  search-width: 280px
  search-width-focus: 50%
  details-width: 300px
components:
  top-bar:
    background: '{colors.bg-mica}'
    height: '{spacing.toolbar-height}'
    gap: 4px
  address-field:
    background: '{colors.bg-layer}'
    border: '{colors.border}'
    border-bottom: '{colors.field-underline}'
    radius: '{rounded.DEFAULT}'
    height: '{spacing.field-height}'
    foreground: '{colors.text}'
  search-box:
    background: '{colors.bg-layer}'
    border: '{colors.border}'
    border-bottom: '{colors.field-underline}'
    border-bottom-focus: '{colors.accent}'
    radius: '{rounded.DEFAULT}'
    height: '{spacing.field-height}'
    width: '{spacing.search-width}'
    width-focus: '{spacing.search-width-focus}'
    background-paused: '{colors.paused-bg}'
    foreground-paused: '{colors.paused-text}'
  search-control-button:
    size: 24px
    iconSize: 12px
    background-hover: '{colors.bg-hover}'
    foreground: '{colors.text}'
    foreground-resume: '{colors.accent}'
    radius: '{rounded.DEFAULT}'
  scan-progress:
    height: 3px
    fill-scanning: '{colors.scan-progress}'
    fill-paused: '{colors.paused}'
  sort-button:
    height: '{spacing.field-height}'
    background: '{colors.bg-layer}'
    border: '{colors.border}'
    border-bottom: '{colors.field-underline}'
    foreground-disabled: '{colors.text-disabled}'
    radius: '{rounded.DEFAULT}'
  result-row:
    height: '{spacing.result-row-height}'
    background: '{colors.bg-layer}'
    background-hover: '{colors.row-hover}'
    background-selected: '{colors.result-selected}'
    selection-indicator: '{colors.accent}'
    divider: '{colors.row-divider}'
  proximity-ring:
    size: 38px
    stroke: 2.5px
    track: '{colors.ring-track}'
    fill: '{colors.ring-fill}'
    iconSize: 16px
    badge-background: '{colors.bg-layer}'
    badge-border: '{colors.border}'
    badge-radius: '{rounded.badge}'
    badge-typography: '{typography.badge}'
  preview-pane:
    width: '{spacing.details-width}'
    background: '{colors.details-bg}'
    border: '{colors.border}'
    padding: 16px
---

## Brand & Style

FileExplorer נראה ומרגיש כמו סייר הקבצים של Windows 11 (Fluent): שכבות Mica אפורות-בהירות, שדות לבנים עם קו תחתון עדין, פינות קטנות, ופלטה מאופקת עם צבע אחד שאינו ניטרלי - כחול ה-accent. המסמך מרחיב את `src/styles/tokens.css`; מה שלא הוגדר כאן יורש משם. מקור ההחלטות: `.memlog.md` (כיוון Windows 11, מצב בהיר בלבד).

מחוץ לתחום כרגע (out-of-scope): מצב כהה (בלוק `prefers-color-scheme: dark` שבקוד אינו מכוסה כאן) ונגישות כנושא ייעודי. RTL נשאר כי האפליקציה בעברית.

## Colors

- **Mica (`{colors.bg-mica}`)** הוא רקע החלון והשורה העליונה. **Layer (`{colors.bg-layer}`)** הוא רקע של שדות, אזור התוצאות ושורות.
- **Accent (`{colors.accent}`)** משמש לקו הפוקוס התחתון של החיפוש, פס הסריקה, טבעת הקרבה, פס הבחירה ופעולת "המשך". לא לקישוט.
- **צבעי מצב סריקה:** בסריקה פעילה הפס כחול (`{colors.scan-progress}`). בהשהיה הפס קפוא בכתום (`{colors.paused}`), השדה מקבל `{colors.paused-bg}` והטקסט `{colors.paused-text}`. (override ב-memlog: כחול בסריקה, כתום בהשהיה.)
- **אין ירוק סיום.** הטיוטה הראשונה הציגה מעבר כחול-לירוק עם `#0f7b0f`; המשתמש לא אישר ירוק בסיום ולכן הטוקן לא הוכנס. בסיום הסריקה הפס אינו נעלם: הוא קופץ ל-100% ונשאר מלא כחול, כדי לסמן שהסריקה הסתיימה [הוחלט ע"י המשתמש; הצבע הכחול נשאר [ASSUMPTION]].
- **שורות:** ריחוף `{colors.row-hover}`, נבחרת `{colors.result-selected}` עם פס בחירה ב-`{colors.accent}`.
- **צבע אייקון PDF (`{colors.file-type-pdf}`)** דקורטיבי בלבד ואינו מעביר משמעות לבדו.
- **סתירות מול הקוד הקיים** (הטיוטות סטו מ-`tokens.css`; להכריע ביישום): `text` בקוד `#1a1a1a` מול `#1b1b1b` בטיוטה; `border-strong` בקוד `#c8c8c8` מול `#8d8d8d` בטיוטה (כאן נוסף `field-underline` נפרד כדי לא לדרוס את הקיים); `bg-selected` בקוד `#cce8ff` מול `#e6f0fa` בטיוטה (כאן `result-selected` נפרד; האם לאחד - Open Question); `bg-hover` שקוף בקוד מול `#e9e9e9` מוצק בטיוטה (נשמר הקיים).

## Typography

משפחת הגופן `Segoe UI Variable Text` עם נפילה ל-`Segoe UI` ול-system-ui, כבקוד. גודל בסיס 14px (`{typography.body}`), כותרת 16px, טקסט קטן 12px (תאריך שינוי, תוויות עמודות), נתיב 13px, ותג אחוז הקרבה 10px. מספרים בחיווי הסריקה ובעמודת הגודל עם `font-variant-numeric: tabular-nums` כדי שהטקסט לא יקפוץ בזמן ספירה. נתיבים בעברית ובאנגלית בשורה אחת משתמשים ב-`unicode-bidi: plaintext` וב-`bdi`.

## Layout & Spacing

סקאלה: 6 / 8 / 12 מהקוד, ו-4px בין אלמנטים בשורה העליונה. שורה עליונה בגובה `{spacing.toolbar-height}` [הוחלט: 44px, אושר ע"י המשתמש], שדות בגובה `{spacing.field-height}`. שורת תוצאה בגובה `{spacing.result-row-height}`; שורת רשימה רגילה נשארת `{spacing.row-height}`.

פריסה (RTL): עץ תיקיות בימין, אזור תוצאות במרכז, חלונית פרטים משמאל ברוחב `{spacing.details-width}`. שורה עליונה B: כפתורי ניווט (אחורה, קדימה, למעלה, רענון), אייקון בחירת תיקייה קטן, כתובת גמישה, ואז חיפוש ברוחב `{spacing.search-width}` בצד שמאל. בפוקוס החיפוש מתרחב ל-`{spacing.search-width-focus}` והכתובת מתקצרת. עמודות תוצאה: `minmax(0,1fr)` / 36% / 90px (שם עם תאריך, נתיב, גודל).

## Elevation & Depth

עומק נוצר בגוון (Mica מול Layer) ובקווי מסגרת, לא בצללים. החריג היחיד בטיוטה: צל עדין (`0 1px 3px rgba(0,0,0,.08)`) על דף המסמך בתצוגה המקדימה. צל מסגרת הדפדפן הוא של דף ההדגמה בלבד ואינו חלק מהאפליקציה. חלונית הבחירה (FR-18) לא עוצבה.

## Shapes

`{rounded.DEFAULT}` (4px) לשדות, כפתורים ושורות נבחרות. `{rounded.lg}` (8px) לחלון ולכרטיסים. תג אחוז הקרבה בצורת גלולה קטנה (`{rounded.badge}`). טבעת הקרבה מעגלית עם קצה מעוגל. פס הסריקה והבחירה הם פסים ישרים בגובה 3px.

## Components

- **top-bar** (`{components.top-bar}`) - שורה אחת: ניווט, אייקון בחירת תיקייה (מחליף את הכפתור הכחול "בחירת תיקייה"), כתובת וחיפוש.
- **address-field** - breadcrumb בתוך שדה לבן עם קו תחתון. בפוקוס חיפוש מתקצר ל-`… › שם-תיקייה`.
- **search-box** (`{components.search-box}`) - 280px במנוחה, 50% בפוקוס, קו תחתון 2px ב-`{colors.accent}` בפוקוס. אייקון זכוכית מגדלת בצד ההתחלה ובצד הסוף בלוק בקרים. מצב מושהה: רקע `{colors.paused-bg}`.
- **search-control-button** - ריבועי 24px עם אייקון 12px, בתוך התיבה בלבד ורק אחרי תחילת חיפוש: עצירה = ריבוע שחור קטן; השהיה = שני פסים אנכיים; המשך = משולש ב-`{colors.accent}`.
- **scan-progress** (`{components.scan-progress}`) - פס 3px בתחתית תיבת החיפוש; רוחב = תוצאות שנמצאו / 500 (FR-12), קופץ ל-100% בסיום הסריקה ונשאר מלא, מתמלא מצד ההתחלה (ימין ב-RTL); כחול בסריקה, כתום קפוא בהשהיה. [הוחלט ע"י המשתמש]
- **sort-button** - "מיון לפי קרבה" עם אייקון, תמיד גלוי (FR-16). מושבת (`{colors.text-disabled}`) בזמן סריקה פעילה עם tooltip "המיון יהיה זמין בסיום הסריקה". מיון פעיל מקבל קו תחתון `{colors.accent}`.
- **result-row** (`{components.result-row}`) - עמודה 1: טבעת קרבה עם אייקון, שם, ומתחתיו "שונה ב-<תאריך>" בטקסט קטן; עמודה 2: נתיב ב-`{colors.text-secondary}`; עמודה 3: גודל בסוף השורה. שורה חדשה נכנסת באנימציה קצרה (שקיפות והזזה של 6px, 0.4 שניות).
- **proximity-ring** (`{components.proximity-ring}`) - טבעת 38px סביב אייקון הקובץ; קשת `{colors.ring-fill}` מתמלאת ביחס לאחוז על מסלול `{colors.ring-track}`, מתחילה מלמעלה. תג מספר (`{typography.badge}`) תלוי בתחתית הטבעת.
- **preview-pane** (`{components.preview-pane}`) - חלונית הפרטים הקיימת: דף מקדים, כותרת, זוגות מפתח-ערך, ובלי בחירה ההנחיה "בחרו תוצאה כדי לראות תצוגה מקדימה".

### חיווי קרבה

אחוז הקרבה מוצג בשני ערוצים יחד - מילוי הטבעת והמספר בתג - כך שאין תלות בצבע. לפי FR-17 הקנס הוא 5 נקודות לכל רמת עומק **כולל עומק 1** (פריט ישיר במיקום הנוכחי), ולכן המקסימום לפריט ישיר הוא **95%**, ולעומק 3 - 85%. טיוטת `key-search-results-1.html` מציגה 100% לפריט עליון - אי-התאמה מתועדת; לפי override ב-memlog הספיינים גוברים ואין להציג 100% לתוצאה בעומק 1 ומעלה. 100% קיים רק כבסיס התאמת שם לפני תיקון עומק (FR-15).

## Do's and Don'ts

| Do | Don't |
|---|---|
| אייקוני עצירה/השהיה/המשך רק בתוך תיבת החיפוש, רק אחרי תחילת חיפוש | כפתורי עצירה מחוץ לשדה או כפתור "עצור סופית" נפרד |
| כחול בסריקה, כתום בהשהיה | ירוק בסיום סריקה (לא אושר) |
| להרחיב טוקנים קיימים של `tokens.css` | להמציא מחדש צבעי בסיס או רדיוסים |
| אחוז קרבה גם כמספר וגם כטבעת | להסתמך על צבע או על הטבעת לבדם |
| צל רק לדף בתצוגה המקדימה | צללים להיררכיה |
| מצב בהיר בלבד בשלב זה | לעצב מצב כהה (out-of-scope) |
