
- source_spec: `_bmad-output/implementation-artifacts/spec-1-1-pattern-matching-engine.md`
  summary: להחליט אם סיומת מרובת חלקים (`*.tar.gz`) ודפוס ריק מקבלים טיפול מיוחד ב-`compilePattern`.
  evidence: כיום `*.tar.gz` נחשב תבנית שם ו-`''` תואם הכול; לא נדרש ב-AC של סיפור 1.1.

- source_spec: `_bmad-output/implementation-artifacts/spec-1-2-incremental-tree-scan.md`
  summary: ה-maps הפנימיים `folders` ו-`files` ב-`BrowserFileSystemAdapter` גדלים בסריקה עמוקה ולא מתנקים.
  evidence: `listNames` רושם handle לכל פריט שנסרק; בעץ של מאות אלפי קבצים זה זיכרון שלא משתחרר.
- source_spec: `_bmad-output/implementation-artifacts/spec-1-2-incremental-tree-scan.md`
  summary: ל-UI אין דרך לדעת על תיקיות שדולגו או על כשל בשורש (סיום שקט בלבד).
  evidence: `listOrSkip` מחזיר מערך ריק ל-`FsError`; סיפור 1.3 צריך להחליט אם להציג זאת.
