import { useMemo } from 'react'
import type { FileSystemEntry } from '../lib/models/entry'
import { filterByTypes } from '../lib/utils/typeFilter'
import { useExplorer } from './ExplorerContext'
import { useSearchOptional, type EntryDetails } from './SearchContext'

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
      return (session?.results ?? []).map((result) => withDetails(result.entry, details ?? {}))
    }
    return filterByTypes(state.entries, state.typeFilter)
  }, [location.type, session, details, state.entries, state.typeFilter])
}

/** הפריט היחיד שנבחר (כולל גודל ותאריך שנטענו לתוצאה), או null. */
export function useSelectedEntry(): FileSystemEntry | null {
  const { state, location } = useExplorer()
  const search = useSearchOptional()
  const session = search?.session ?? null
  const details = search?.details
  return useMemo(() => {
    if (state.selection.length !== 1) return null
    const id = state.selection[0]
    if (location.type === 'search') {
      const result = session?.results.find((r) => r.entry.id === id)
      return result ? withDetails(result.entry, details ?? {}) : null
    }
    return state.entries.find((e) => e.id === id) ?? null
  }, [state.selection, state.entries, location.type, session, details])
}
