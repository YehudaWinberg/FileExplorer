import { useEffect, useState } from 'react'
import { FsError } from '../lib/fileSystem'
import type { FileSystemEntry } from '../lib/models/entry'
import { countLines, isTxtFile } from '../lib/utils/lineCount'
import { useExplorer } from '../state/ExplorerContext'

export type LineCount =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; value: number }

const LOADING: LineCount = { status: 'loading' }

/** כמה קבצים נקראים במקביל, כדי שתיקייה גדולה לא תפתח אלפי קריאות בבת אחת. */
export const PARALLEL_READS = 4

/** תוצאות שמגיעות בפרק זמן זה מוצגות יחד, במקום רינדור של כל הרשימה עבור כל קובץ. */
const FLUSH_MS = 50

const fileError = (error: unknown) => (error instanceof FsError ? error.message : 'לא ניתן לקרוא את הקובץ.')

/**
 * סופר ברקע את השורות בקובצי ה-TXT שברשימה. התוצאות מסומנות ברשימת הפריטים שאליה הן שייכות,
 * כך שתוצאה שהגיעה באיחור מתיקייה קודמת (או מלפני רענון) לעולם אינה מוצגת.
 * מחזיר null עבור פריט שאינו קובץ TXT.
 */
export function useLineCounts(entries: FileSystemEntry[]): (entry: FileSystemEntry) => LineCount | null {
  const { adapter } = useExplorer()
  const [state, setState] = useState<{ entries: FileSystemEntry[]; counts: Record<string, LineCount> } | null>(null)

  useEffect(() => {
    const queue = entries.filter(isTxtFile)
    if (queue.length === 0) return
    let active = true
    let next = 0
    let buffer: Record<string, LineCount> = {}
    let timer: ReturnType<typeof setTimeout> | undefined

    const flush = () => {
      timer = undefined
      const batch = buffer
      buffer = {}
      setState((prev) => ({ entries, counts: { ...(prev?.entries === entries ? prev.counts : {}), ...batch } }))
    }
    const report = (id: string, count: LineCount) => {
      if (!active) return
      buffer[id] = count
      if (timer === undefined) timer = setTimeout(flush, FLUSH_MS)
    }
    const worker = async () => {
      while (active && next < queue.length) {
        const entry = queue[next++]
        try {
          report(entry.id, { status: 'ready', value: await countLines(await adapter.getFile(entry)) })
        } catch (error) {
          report(entry.id, { status: 'error', message: fileError(error) })
        }
      }
    }

    for (let i = 0; i < Math.min(PARALLEL_READS, queue.length); i++) void worker()
    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [adapter, entries])

  const counts = state?.entries === entries ? state.counts : {}
  return (entry) => (isTxtFile(entry) ? (counts[entry.id] ?? LOADING) : null)
}
