import type { FileSystemEntry } from '../models/entry'
import type { SortState } from '../models/sort'
import { getTypeLabel } from './fileTypes'

const collator = new Intl.Collator('he', { numeric: true, sensitivity: 'base' })

function compareBy(a: FileSystemEntry, b: FileSystemEntry, key: SortState['key']): number {
  switch (key) {
    case 'name':
      return collator.compare(a.name, b.name)
    case 'type':
      return collator.compare(getTypeLabel(a), getTypeLabel(b))
    case 'size':
      return (a.size ?? 0) - (b.size ?? 0)
    case 'elapsed':
      return (b.modified ?? 0) - (a.modified ?? 0)
    case 'modified':
      return (a.modified ?? 0) - (b.modified ?? 0)
  }
}

/** תיקיות תמיד לפני קבצים; בתוך כל קבוצה ממיינים לפי העמודה שנבחרה. */
export function sortEntries(entries: FileSystemEntry[], sort: SortState): FileSystemEntry[] {
  const sign = sort.direction === 'asc' ? 1 : -1
  return [...entries].sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === 'folder' ? -1 : 1
    const primary = compareBy(a, b, sort.key) * sign
    return primary !== 0 ? primary : collator.compare(a.name, b.name)
  })
}
