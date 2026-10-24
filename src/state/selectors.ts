import { useMemo } from 'react'
import type { FileSystemEntry } from '../lib/models/entry'
import { filterByTypes } from '../lib/utils/typeFilter'
import { useExplorer } from './ExplorerContext'
import { useSearchOptional, type EntryDetails } from './SearchContext'
import { orderResults } from './searchReducer'

export function withDetails(entry: FileSystemEntry, details: Record<string, EntryDetails>): FileSystemEntry {
  const extra = details[entry.id]
  return extra ? { ...entry, ...extra } : entry
}

/** הפריטים שמוצגים כרגע: תוצאות החיפוש במסך תוצאות, ואחרת תוכן התיקייה אחרי חיפוש וסינון. */
export function useVisibleEntries(): FileSystemEntry[] {
  const { state, location } = useExplorer()
  const search = useSearchOptional()
  const session = search?.session ?? null
  const details = search?.details
  return useMemo(() => {
    if (location.type === 'search') {
      return orderResults(session?.results ?? [], session?.sortedByScore ?? false).map((result) =>
        withDetails(result.entry, details ?? {}),
      )
    }
    return filterByTypes(state.entries, state.typeFilter)
  }, [location.type, session, details, state.entries, state.typeFilter])
}

/** הפריט היחיד שנבחר (כולל גודל ותאריך שנטענו לתוצאה), או null. זהות האובייקט יציבה כל עוד הפריט ופרטיו לא השתנו. */
export function useSelectedEntry(): FileSystemEntry | null {
  const { state, location } = useExplorer()
  const search = useSearchOptional()
  const id = state.selection.length === 1 ? state.selection[0] : null
  const base =
    id === null
      ? null
      : location.type === 'search'
        ? (search?.session?.results.find((r) => r.entry.id === id)?.entry ?? null)
        : (state.entries.find((e) => e.id === id) ?? null)
  const extra = id !== null && location.type === 'search' ? search?.details[id] : undefined
  return useMemo(() => (base && extra ? { ...base, ...extra } : base), [base, extra])
}
