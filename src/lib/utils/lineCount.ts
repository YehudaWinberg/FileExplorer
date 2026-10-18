import type { FileSystemEntry } from '../models/entry'

const LF = 0x0a

/** כמה בתים נקראים בכל פעם, כדי לא לטעון קובץ גדול לזיכרון בבת אחת. */
const CHUNK_BYTES = 1024 * 1024

/** קובץ TXT בלבד. הסיומת כבר מנורמלת לאותיות קטנות (getExtension), ולכן TXT/Txt נכללים. */
export function isTxtFile(entry: Pick<FileSystemEntry, 'kind' | 'extension'>): boolean {
  return entry.kind === 'file' && entry.extension === 'txt'
}

/**
 * מספר השורות בקובץ, כולל שורות ריקות: מספר תווי LF, ועוד שורה אחת אם הקובץ אינו מסתיים ב-LF.
 * קובץ ריק = 0. CRLF נספר פעם אחת (לפי ה-LF שבו).
 * הספירה לפי בתים מתאימה ל-UTF-8, ASCII וקידודים של בית יחיד (לא ל-UTF-16).
 */
export async function countLines(file: Blob, chunkBytes: number = CHUNK_BYTES): Promise<number> {
  if (file.size === 0) return 0
  let breaks = 0
  let last = 0
  for (let offset = 0; offset < file.size; offset += chunkBytes) {
    const bytes = new Uint8Array(await file.slice(offset, offset + chunkBytes).arrayBuffer())
    for (let i = bytes.indexOf(LF); i !== -1; i = bytes.indexOf(LF, i + 1)) breaks++
    if (bytes.length > 0) last = bytes[bytes.length - 1]
  }
  return last === LF ? breaks : breaks + 1
}
