import type { FileSystemEntry } from '../models/entry'
import { getTypeLabel } from './fileTypes'

const collator = new Intl.Collator('he', { numeric: true, sensitivity: 'base' })

/** סוגי הקבצים (לפי תווית הסוג) שקיימים ברשימה, ממוינים — אפשרויות הסינון. */
export function getTypeOptions(entries: FileSystemEntry[]): string[] {
  return [...new Set(entries.map(getTypeLabel))].sort((a, b) => collator.compare(a, b))
}

/** ללא סוגים נבחרים — אין סינון. */
export function filterByTypes(entries: FileSystemEntry[], selected: string[]): FileSystemEntry[] {
  if (selected.length === 0) return entries
  const allowed = new Set(selected)
  return entries.filter((entry) => allowed.has(getTypeLabel(entry)))
}
