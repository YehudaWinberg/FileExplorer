/** תקרת גודל לתצוגה מקדימה של דף HTML (5MB); מעליה לא טוענים את הקובץ לזיכרון. */
export const HTML_PREVIEW_MAX_BYTES = 5 * 1024 * 1024

/** מדיניות שחוסמת כל בקשת רשת מהדף המוצג: רק data:/blob: וסגנונות inline. */
const PREVIEW_HEAD =
  '<meta charset="utf-8">' +
  '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; img-src data: blob:; ' +
  'media-src data: blob:; font-src data:; style-src \'unsafe-inline\'">' +
  // base ראשון קובע: קישורים נפתחים ב-_blank, ובלי allow-popups ב-sandbox הלחיצה לא עושה דבר.
  '<base href="about:blank" target="_blank">'

// כל <meta http-equiv=...> (בעיקר refresh, שמנווט את ה-iframe לאתר חיצוני בלי לחיצה); ערכים יכולים להכיל ">" בתוך מרכאות.
const HTTP_EQUIV_META = /<meta\b(?:[^>"']|"[^"]*"|'[^']*')*?\bhttp-equiv\b(?:[^>"']|"[^"]*"|'[^']*')*>/gi

/**
 * מסיר meta שמנווטים/משנים כותרות, ומוסיף לדף charset, CSP ו-base.
 * ההוספה אחרי ה-doctype (אם קיים) כדי לא להעביר את הדף למצב quirks.
 */
export function buildPreviewHtml(text: string): string {
  const body = text.replace(/^\uFEFF/, '').replace(HTTP_EQUIV_META, '')
  const doctype = /^\s*<!doctype[^>]*>/i.exec(body)
  if (!doctype) return PREVIEW_HEAD + body
  return body.slice(0, doctype[0].length) + PREVIEW_HEAD + body.slice(doctype[0].length)
}
