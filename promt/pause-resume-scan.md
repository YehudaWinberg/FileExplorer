**Task:** הרצת `/bmad-build` על סיפור 2.1 ("השהיה והמשך של סריקה") מתוך `_bmad-output/planning-artifacts/epics.md`, בענף `feat/pause-resume-scan`.

**סיכום:**
1. הסטטוס `paused` ב-`searchReducer`, עם פעולות `pause` ו-`resume`; תוצאה שכבר בדרך בהשהיה נשמרת, ואי אפשר `resume` מ-`stopped`/`done`.
2. לולאת הסריקה ב-`SearchProvider` לא קוראת ל-`next()` בהשהיה וממשיכה מאותו מחולל בהמשך, בלי סריקה מחדש.
3. יציאה מ-`search` ב-back/forward בזמן סריקה משהה אותה ושומרת את הסשן.
4. בתיבת החיפוש: כפתורי השהיה, המשך ועצירה, טקסט `מושהה — נמצאו N` ורקע `paused-bg`.
