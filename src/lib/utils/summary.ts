import type { FileSystemEntry } from '../models/entry'

/** מספר הפריטים (קבצים ותיקיות) וסך גודל הקבצים בבתים. */
export function summarizeEntries(entries: FileSystemEntry[]): { count: number; totalBytes: number } {
  return { count: entries.length, totalBytes: entries.reduce((sum, e) => sum + (e.size ?? 0), 0) }
}
