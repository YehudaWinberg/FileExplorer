**Task:** הרצת `/bmad-build` על סיפור 3.2 ("טבעת קרבה בשורת תוצאה") מתוך `_bmad-output/planning-artifacts/epics.md`, בענף `feat/proximity-ring`.

**סיכום:**
1. נוסף `ProximityRing`: טבעת 38px (stroke 2.5px) סביב אייקון 16px, קשת `ring-fill` שמתחילה מלמעלה על מסלול `ring-track`, ותג מספר בתחתית.
2. הציון מגיע מ-`SearchResult.score` (סיפור 3.1) ומוצג גם ב-tooltip וב-`aria-label` (`קרבה N אחוז`), כך שהמידע אינו תלוי בצבע.
3. בדיקות רכיב לערכים 0, 67, 85, 95 ולחיתוך טווח, ובדיקה שהשורות מציגות 95 לעומק 1 ו-75 לעומק 5.
