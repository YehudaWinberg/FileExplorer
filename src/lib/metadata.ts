/**
 * חילוץ מטא-דאטה של תמונות (מידות ו-EXIF) מתוך בתים. ללא תלות ב-React או ב-DOM,
 * כך שאפשר לבדוק את הלוגיקה בנפרד. הקריאה עצמה היא של File בלבד (קריאה בלבד).
 */

export interface ImageSize {
  width: number
  height: number
}

export interface ExifData {
  make?: string
  model?: string
  software?: string
  lens?: string
  /** תאריך הצילום כפי שנרשם במצלמה (YYYY:MM:DD HH:MM:SS). */
  dateTaken?: string
  /** זמן חשיפה בשניות. */
  exposureTime?: number
  fNumber?: number
  iso?: number
  /** אורך מוקד במ"מ. */
  focalLength?: number
  orientation?: number
  gps?: { latitude: number; longitude: number }
}

export interface FileMetadata {
  size?: ImageSize
  exif?: ExifData
}

/** כמה בתים מראש הקובץ נקראים. כותרות תמונה ו-EXIF נמצאות בתחילת הקובץ. */
const HEADER_BYTES = 1024 * 1024

const ascii = (bytes: Uint8Array, start: number, length: number): string =>
  String.fromCharCode(...bytes.subarray(start, start + length))

// ---------- מידות תמונה ----------

function pngSize(bytes: Uint8Array, view: DataView): ImageSize | null {
  if (bytes.length < 24 || ascii(bytes, 12, 4) !== 'IHDR') return null
  return { width: view.getUint32(16), height: view.getUint32(20) }
}

function gifSize(view: DataView): ImageSize | null {
  return view.byteLength < 10 ? null : { width: view.getUint16(6, true), height: view.getUint16(8, true) }
}

function bmpSize(view: DataView): ImageSize | null {
  if (view.byteLength < 26) return null
  return { width: Math.abs(view.getInt32(18, true)), height: Math.abs(view.getInt32(22, true)) }
}

function webpSize(bytes: Uint8Array, view: DataView): ImageSize | null {
  if (bytes.length < 30) return null
  const format = ascii(bytes, 12, 4)
  if (format === 'VP8X') {
    const w = bytes[24] | (bytes[25] << 8) | (bytes[26] << 16)
    const h = bytes[27] | (bytes[28] << 8) | (bytes[29] << 16)
    return { width: w + 1, height: h + 1 }
  }
  if (format === 'VP8L') {
    const bits = view.getUint32(21, true)
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 }
  }
  if (format === 'VP8 ') {
    return { width: view.getUint16(26, true) & 0x3fff, height: view.getUint16(28, true) & 0x3fff }
  }
  return null
}

function jpegSize(bytes: Uint8Array, view: DataView): ImageSize | null {
  let offset = 2
  while (offset + 4 <= bytes.length) {
    if (bytes[offset] !== 0xff) return null
    const marker = bytes[offset + 1]
    if (marker === 0xff) {
      offset++
      continue
    }
    // SOF0-SOF15, למעט DHT (C4), JPG (C8) ו-DAC (CC).
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      if (offset + 9 > bytes.length) return null
      return { height: view.getUint16(offset + 5), width: view.getUint16(offset + 7) }
    }
    if (marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd7) || marker === 0x01) {
      offset += 2
      continue
    }
    offset += 2 + view.getUint16(offset + 2)
  }
  return null
}

export function readImageSize(bytes: Uint8Array): ImageSize | null {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  try {
    let size: ImageSize | null = null
    if (bytes[0] === 0x89 && ascii(bytes, 1, 3) === 'PNG') size = pngSize(bytes, view)
    else if (ascii(bytes, 0, 3) === 'GIF') size = gifSize(view)
    else if (ascii(bytes, 0, 2) === 'BM') size = bmpSize(view)
    else if (ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 4) === 'WEBP') size = webpSize(bytes, view)
    else if (bytes[0] === 0xff && bytes[1] === 0xd8) size = jpegSize(bytes, view)
    return size && size.width > 0 && size.height > 0 ? size : null
  } catch {
    return null
  }
}

// ---------- EXIF ----------

const TYPE_SIZE: Record<number, number> = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 7: 1, 9: 4, 10: 8 }

type ExifValue = string | number[]

interface Tiff {
  view: DataView
  base: number
  little: boolean
}

function readEntryValue({ view, base, little }: Tiff, entry: number): ExifValue | null {
  const type = view.getUint16(entry + 2, little)
  const count = view.getUint32(entry + 4, little)
  const unit = TYPE_SIZE[type]
  if (!unit || count > 4096) return null
  const total = unit * count
  const start = total <= 4 ? entry + 8 : base + view.getUint32(entry + 8, little)
  if (start < 0 || start + total > view.byteLength) return null

  if (type === 2) {
    let text = ''
    for (let i = 0; i < count; i++) {
      const code = view.getUint8(start + i)
      if (code === 0) break
      text += String.fromCharCode(code)
    }
    return text.trim()
  }
  const values: number[] = []
  for (let i = 0; i < count; i++) {
    const at = start + i * unit
    switch (type) {
      case 3:
        values.push(view.getUint16(at, little))
        break
      case 4:
        values.push(view.getUint32(at, little))
        break
      case 5: {
        const denominator = view.getUint32(at + 4, little)
        values.push(denominator ? view.getUint32(at, little) / denominator : 0)
        break
      }
      case 10: {
        const denominator = view.getInt32(at + 4, little)
        values.push(denominator ? view.getInt32(at, little) / denominator : 0)
        break
      }
      default:
        values.push(view.getUint8(at))
    }
  }
  return values
}

function readIfd(tiff: Tiff, offset: number): Map<number, ExifValue> {
  const tags = new Map<number, ExifValue>()
  const { view, base, little } = tiff
  const start = base + offset
  if (start + 2 > view.byteLength) return tags
  const count = view.getUint16(start, little)
  for (let i = 0; i < count; i++) {
    const entry = start + 2 + i * 12
    if (entry + 12 > view.byteLength) break
    const value = readEntryValue(tiff, entry)
    if (value !== null) tags.set(view.getUint16(entry, little), value)
  }
  return tags
}

const text = (value: ExifValue | undefined): string | undefined =>
  typeof value === 'string' && value ? value : undefined
const num = (value: ExifValue | undefined): number | undefined =>
  Array.isArray(value) && value.length > 0 ? value[0] : undefined

function gpsCoordinate(
  value: ExifValue | undefined,
  ref: ExifValue | undefined,
  negative: string,
): number | undefined {
  if (!Array.isArray(value) || value.length < 3) return undefined
  const degrees = value[0] + value[1] / 60 + value[2] / 3600
  return text(ref)?.toUpperCase() === negative ? -degrees : degrees
}

function parseTiff(view: DataView, base: number): ExifData | null {
  if (base + 8 > view.byteLength) return null
  const order = view.getUint16(base)
  if (order !== 0x4949 && order !== 0x4d4d) return null
  const tiff: Tiff = { view, base, little: order === 0x4949 }
  if (view.getUint16(base + 2, tiff.little) !== 42) return null

  const main = readIfd(tiff, view.getUint32(base + 4, tiff.little))
  const exifPointer = num(main.get(0x8769))
  const gpsPointer = num(main.get(0x8825))
  const exif = exifPointer === undefined ? new Map<number, ExifValue>() : readIfd(tiff, exifPointer)
  const gps = gpsPointer === undefined ? new Map<number, ExifValue>() : readIfd(tiff, gpsPointer)

  const data: ExifData = {
    make: text(main.get(0x010f)),
    model: text(main.get(0x0110)),
    software: text(main.get(0x0131)),
    orientation: num(main.get(0x0112)),
    dateTaken: text(exif.get(0x9003)) ?? text(main.get(0x0132)),
    exposureTime: num(exif.get(0x829a)),
    fNumber: num(exif.get(0x829d)),
    iso: num(exif.get(0x8827)),
    focalLength: num(exif.get(0x920a)),
    lens: text(exif.get(0xa434)),
  }
  const latitude = gpsCoordinate(gps.get(2), gps.get(1), 'S')
  const longitude = gpsCoordinate(gps.get(4), gps.get(3), 'W')
  if (latitude !== undefined && longitude !== undefined) data.gps = { latitude, longitude }

  const clean = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined)) as ExifData
  return Object.keys(clean).length > 0 ? clean : null
}

/** מחזיר את נתוני ה-EXIF של קובץ JPEG, או null אם אין. */
export function readExif(bytes: Uint8Array): ExifData | null {
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) return null
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  try {
    let offset = 2
    while (offset + 4 <= bytes.length && bytes[offset] === 0xff) {
      const marker = bytes[offset + 1]
      if (marker === 0xda || marker === 0xd9) return null
      const length = view.getUint16(offset + 2)
      if (marker === 0xe1 && ascii(bytes, offset + 4, 6) === 'Exif\0\0') {
        return parseTiff(view, offset + 10)
      }
      offset += 2 + length
    }
  } catch {
    return null
  }
  return null
}

// ---------- קריאה מקובץ ----------

/** קורא רק את תחילת הקובץ ומחלץ ממנו מידות תמונה ו-EXIF (אם קיימים). */
export async function extractFileMetadata(file: Blob): Promise<FileMetadata> {
  const bytes = new Uint8Array(await file.slice(0, HEADER_BYTES).arrayBuffer())
  const metadata: FileMetadata = {}
  const size = readImageSize(bytes)
  if (size) metadata.size = size
  const exif = readExif(bytes)
  if (exif) metadata.exif = exif
  return metadata
}

// ---------- הצגה ----------

export function formatExposure(seconds: number): string {
  return seconds >= 1 ? `${seconds} שנ׳` : `1/${Math.round(1 / seconds)} שנ׳`
}

/** שורות תיאור (תווית וערך) לנתוני EXIF הקיימים בלבד. */
export function exifRows(exif: ExifData): Array<{ label: string; value: string }> {
  const rows: Array<{ label: string; value: string | undefined }> = [
    { label: 'מצלמה', value: [exif.make, exif.model].filter(Boolean).join(' ') || undefined },
    { label: 'עדשה', value: exif.lens },
    { label: 'תאריך צילום', value: exif.dateTaken },
    { label: 'חשיפה', value: exif.exposureTime ? formatExposure(exif.exposureTime) : undefined },
    { label: 'צמצם', value: exif.fNumber ? `f/${Math.round(exif.fNumber * 10) / 10}` : undefined },
    { label: 'ISO', value: exif.iso?.toString() },
    { label: 'אורך מוקד', value: exif.focalLength ? `${Math.round(exif.focalLength * 10) / 10} מ״מ` : undefined },
    { label: 'תוכנה', value: exif.software },
    {
      label: 'מיקום GPS',
      value: exif.gps ? `${exif.gps.latitude.toFixed(5)}, ${exif.gps.longitude.toFixed(5)}` : undefined,
    },
  ]
  return rows.filter((row): row is { label: string; value: string } => row.value !== undefined)
}
