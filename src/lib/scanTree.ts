import { FsError, type FileSystemAdapter } from './fileSystem'
import type { FileSystemEntry, FolderRef } from './models/entry'
import { matchesPattern, type CompiledPattern } from './utils/pattern'

/** תיקיות שאינן נסרקות (כבדות ולא מעניינות). הרשימה היחידה, מצומצמת במכוון. */
export const SKIP_DIRS: ReadonlySet<string> = new Set(['node_modules', '.git'])

export interface SearchResult {
  entry: FileSystemEntry
  /** התיקייה שמכילה את הפריט. */
  parent: FolderRef
  /** עומק פריט ישיר בשורש הסריקה הוא 1. */
  depth: number
  /** 0 זמני עד חישוב הקרבה (Epic 3). */
  score: number
}

async function listOrSkip(adapter: FileSystemAdapter, folder: FolderRef): Promise<FileSystemEntry[]> {
  try {
    return await adapter.listNames(folder)
  } catch (error) {
    // תיקייה שאי אפשר לקרוא (הרשאה, נעלמה) מדולגת בשקט; כשל בשורש מסיים בלי תוצאות.
    if (error instanceof FsError) return []
    throw error
  }
}

/**
 * סורק את העץ מ-`root` כלפי מטה לפי רמות (BFS) ומחזיר תוצאה אחת לכל yield,
 * כך שפריטים קרובים מגיעים לפני עמוקים. ביטול ה-signal מסיים בלי תוצאות נוספות.
 * קריאה בלבד: משתמש רק ב-`listNames`.
 */
export async function* scanTree(
  adapter: FileSystemAdapter,
  root: FolderRef,
  compiled: CompiledPattern,
  signal: AbortSignal,
): AsyncGenerator<SearchResult> {
  let level: FolderRef[] = [root]
  for (let depth = 1; level.length > 0; depth++) {
    const next: FolderRef[] = []
    for (const parent of level) {
      if (signal.aborted) return
      const entries = await listOrSkip(adapter, parent)
      for (const entry of entries) {
        if (signal.aborted) return
        if (matchesPattern(compiled, entry)) yield { entry, parent, depth, score: 0 }
        if (entry.kind === 'folder' && entry.folder && !SKIP_DIRS.has(entry.name.toLowerCase())) {
          next.push(entry.folder)
        }
      }
    }
    level = next
  }
}
