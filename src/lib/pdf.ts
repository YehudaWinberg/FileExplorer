/** טעינת PDF לתצוגה מקדימה: קריאה בחתיכות עם התקדמות אמיתית, ביטול ו-timeout, וספירת עמודים. */

/** זמן מקסימלי לטעינה לפני שהיא נחשבת ככשלון. */
export const PDF_TIMEOUT_MS = 60_000

/** כמה בתים נקראים בכל פעם; בכל חתיכה מדווחת התקדמות. */
const CHUNK_BYTES = 256 * 1024

export type PdfLoadFailure = 'timeout' | 'aborted' | 'invalid'

export class PdfLoadError extends Error {
  readonly reason: PdfLoadFailure

  constructor(reason: PdfLoadFailure) {
    super(reason)
    this.name = 'PdfLoadError'
    this.reason = reason
  }
}

export interface PdfLoadOptions {
  /** מקבל מספר בין 0 ל-1: חלק הבתים שנקראו מתוך גודל הקובץ. */
  onProgress?: (fraction: number) => void
  signal?: AbortSignal
  timeoutMs?: number
  chunkBytes?: number
}

export interface LoadedPdf {
  blob: Blob
  /** null כאשר אי אפשר לקבוע את מספר העמודים מתוך הבתים (למשל אובייקטים דחוסים). */
  pages: number | null
}

const latin1 = (bytes: Uint8Array) => new TextDecoder('latin1').decode(bytes)

/**
 * מספר העמודים לפי הבתים הגולמיים, ללא ספריית PDF: ספירת אובייקטי /Type /Page,
 * ואם אין כאלה (אובייקטים דחוסים) - הערך /Count הגבוה ביותר ליד /Type /Pages.
 * מחזיר null כשאי אפשר לקבוע, ולא ערך מנוחש.
 */
export function countPdfPages(text: string): number | null {
  const leaves = text.match(/\/Type\s*\/Page(?![A-Za-z])/g)?.length ?? 0
  if (leaves > 0) return leaves

  let count = 0
  for (const match of text.matchAll(/\/Type\s*\/Pages(?![A-Za-z])/g)) {
    const around = text.slice(Math.max(0, match.index - 300), match.index + 300)
    for (const found of around.matchAll(/\/Count\s+(\d+)/g)) count = Math.max(count, Number(found[1]))
  }
  return count > 0 ? count : null
}

/** PDF תקין מתחיל בכותרת %PDF- ומסתיים בסימן %%EOF; אחרת הוא פגום או קטוע. */
export function isValidPdf(head: string, tail: string): boolean {
  return head.includes('%PDF-') && tail.includes('%%EOF')
}

/**
 * טוען PDF: מבקש את הקובץ ומחזיר Blob מסוג application/pdf יחד עם מספר העמודים.
 * ה-timeout חל גם על קבלת הקובץ וגם על קריאתו. אחרי ביטול או timeout לא מדווחת התקדמות נוספת.
 */
export function loadPdf(getFile: () => Promise<Blob>, options: PdfLoadOptions = {}): Promise<LoadedPdf> {
  const { onProgress, signal, timeoutMs = PDF_TIMEOUT_MS, chunkBytes = CHUNK_BYTES } = options

  return new Promise<LoadedPdf>((resolve, reject) => {
    let stopped = false
    const stop = (error: PdfLoadError) => {
      if (stopped) return
      stopped = true
      cleanup()
      reject(error)
    }
    const timer = setTimeout(() => stop(new PdfLoadError('timeout')), timeoutMs)
    const onAbort = () => stop(new PdfLoadError('aborted'))
    const cleanup = () => {
      clearTimeout(timer)
      signal?.removeEventListener('abort', onAbort)
    }
    if (signal?.aborted) return onAbort()
    signal?.addEventListener('abort', onAbort)

    const run = async () => {
      const file = await getFile()
      const chunks: Uint8Array[] = []
      for (let offset = 0; offset < file.size && !stopped; offset += chunkBytes) {
        chunks.push(new Uint8Array(await file.slice(offset, offset + chunkBytes).arrayBuffer()))
        if (!stopped) onProgress?.(Math.min(1, (offset + chunkBytes) / file.size))
      }
      if (stopped) return

      const bytes = new Uint8Array(chunks.reduce((total, chunk) => total + chunk.length, 0))
      let at = 0
      for (const chunk of chunks) {
        bytes.set(chunk, at)
        at += chunk.length
      }
      if (!isValidPdf(latin1(bytes.subarray(0, 1024)), latin1(bytes.subarray(Math.max(0, bytes.length - 1024))))) {
        throw new PdfLoadError('invalid')
      }
      const pages = countPdfPages(latin1(bytes))
      if (stopped) return
      stopped = true
      cleanup()
      resolve({ blob: new Blob([bytes as BlobPart], { type: 'application/pdf' }), pages })
    }

    run().catch((error: unknown) => stop(error instanceof PdfLoadError ? error : new PdfLoadError('invalid')))
  })
}
