import { folderChain, type FolderRef } from '../models/entry'

export const PATH_SEPARATOR = '/'
const MAX_FULL_PARTS = 4

/**
 * נתיב התיקייה של תוצאה לתצוגה: עד 4 חלקים במלואם; ארוך מזה מוצג כשורש,
 * `…` ושתי התיקיות האחרונות. `full` הוא הנתיב המלא (ל-tooltip).
 */
export function formatResultPath(parent: FolderRef): { text: string; full: string } {
  const parts = folderChain(parent).map((folder) => folder.name)
  const full = parts.join(PATH_SEPARATOR)
  if (parts.length <= MAX_FULL_PARTS) return { text: full, full }
  return { text: [parts[0], '…', ...parts.slice(-2)].join(PATH_SEPARATOR), full }
}
