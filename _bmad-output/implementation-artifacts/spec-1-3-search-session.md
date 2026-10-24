---
title: 'מצב חיפוש, סשן והפעלה'
type: 'feature'
created: '2026-10-25'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `scanTree` קיים אך אינו מחובר: אין מיקום `search`, אין סשן תוצאות ואין הפעלה (Story 1.3, AD-5, AD-6, AD-9, AD-10).

**Approach:** `Location` מורחב ב-`search`; `searchReducer` וה-`SearchProvider` מחזיקים סשן אחד ומפעילים סריקה מאפקט יחיד; שער `goTo(location, { origin })` ב-`ExplorerContext` מנקה סשן ומבטל ריצה בניווט `user`. בלי UI חדש.

</frozen-after-approval>

## Implementation Notes

- ניקוי הסשן מחובר דרך `userNavigationHook` (ref ב-ExplorerContext שה-SearchProvider רושם); הוא רץ באותו אירוע לפני ה-dispatch של הניווט.
- החלטות שלי: ביטול debounce תלוי נדחה ל-1.5, כי עדיין אין debounce; יציאה מ-`search` בזמן סריקה (back/forward) משאירה את הסריקה רצה ברקע, והמרה ל-`paused` (AD-3) תיעשה ב-2.1.
- `App` מציג מסך ריק למיקום `search` עד סיפור 1.4.
- פעולת reducer `search` הישנה ו-`nameSearch.ts` לא שונו.

## Review Triage Log

- סריקה ממשיכה ברקע אחרי back: medium, מכוון (ראו הערה); נדחה ל-2.1.
- מסך ריק ב-`search` ללא עצירה: medium, לא ניתן להגיע אליו לפני 1.5 (אין UI שקורא ל-`start`); נדחה.
- `results` מועתק בכל תוצאה (O(n^2)): medium; יטופל עם תקרת 500 ב-2.3.
- בדיקת ביטול באמצע סריקה חסרה: medium; נוספה.
- בדיקת StrictMode אינה מדמה mount עם סריקה פעילה, `locationRef` ישן בקריאות כפולות, שגיאה לא צפויה מדווחת כ-`done`, קריאבילות של `sameLocation`: low; לא טופלו.
