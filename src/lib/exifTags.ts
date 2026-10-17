/**
 * קריאת כל תגיות ה-EXIF הזמינות בקובץ תמונה (JPEG, PNG, WebP) מתוך בתים, בדפדפן בלבד.
 * בניגוד ל-readExif ב-metadata (שמחזיר שדות נבחרים), כאן מוחזרות כל התגיות כשורות תצוגה.
 */
import { formatExposure, readImageSize, type ImageSize } from './metadata'

export type ExifGroup = 'image' | 'exif' | 'gps' | 'interop' | 'thumbnail'

export interface ExifTag {
  group: ExifGroup
  tag: number
  label: string
  value: string
}

export interface ImageDetails {
  size: ImageSize | null
  /** null = לא ניתן היה לפענח את נתוני ה-EXIF; מערך ריק = אין EXIF בקובץ. */
  exif: ExifTag[] | null
}

/** כמה בתים נקראים מהקובץ. ב-PNG ה-EXIF עשוי להופיע אחרי נתוני התמונה. */
const READ_BYTES = 8 * 1024 * 1024

const ascii = (bytes: Uint8Array, start: number, length: number): string =>
  String.fromCharCode(...bytes.subarray(start, start + length))

// ---------- איתור בלוק ה-TIFF בתוך הקובץ ----------

function jpegTiffOffset(bytes: Uint8Array, view: DataView): number | null {
  let offset = 2
  while (offset + 4 <= bytes.length && bytes[offset] === 0xff) {
    const marker = bytes[offset + 1]
    if (marker === 0xda || marker === 0xd9) return null
    if (marker === 0xe1 && ascii(bytes, offset + 4, 6) === 'Exif\0\0') return offset + 10
    offset += 2 + view.getUint16(offset + 2)
  }
  return null
}

function pngTiffOffset(bytes: Uint8Array, view: DataView): number | null {
  let offset = 8
  while (offset + 8 <= bytes.length) {
    const length = view.getUint32(offset)
    const type = ascii(bytes, offset + 4, 4)
    if (type === 'eXIf') return offset + 8
    if (type === 'IEND') return null
    offset += 12 + length
  }
  return null
}

function webpTiffOffset(bytes: Uint8Array, view: DataView): number | null {
  let offset = 12
  while (offset + 8 <= bytes.length) {
    const size = view.getUint32(offset + 4, true)
    if (ascii(bytes, offset, 4) === 'EXIF') {
      const data = offset + 8
      // חלק מהכלים מוסיפים קידומת Exif\0\0 גם בתוך WebP.
      return ascii(bytes, data, 6) === 'Exif\0\0' ? data + 6 : data
    }
    offset += 8 + size + (size % 2)
  }
  return null
}

function findTiffOffset(bytes: Uint8Array, view: DataView): number | null {
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return jpegTiffOffset(bytes, view)
  if (bytes[0] === 0x89 && ascii(bytes, 1, 3) === 'PNG') return pngTiffOffset(bytes, view)
  if (ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 4) === 'WEBP') return webpTiffOffset(bytes, view)
  return null
}

// ---------- קריאת IFD ----------

const TYPE_SIZE: Record<number, number> = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 6: 1, 7: 1, 8: 2, 9: 4, 10: 8, 11: 4, 12: 8 }
/** מספר הערכים המספריים המרבי שנקרא מתגית אחת. */
const MAX_VALUES = 64

type RawValue =
  | { kind: 'text'; text: string }
  | { kind: 'numbers'; values: number[]; count: number }
  | { kind: 'bytes'; bytes: Uint8Array }

interface Tiff {
  view: DataView
  base: number
  little: boolean
}

function readNumber({ view, little }: Tiff, type: number, at: number): number {
  switch (type) {
    case 3:
      return view.getUint16(at, little)
    case 4:
      return view.getUint32(at, little)
    case 5: {
      const den = view.getUint32(at + 4, little)
      return den ? view.getUint32(at, little) / den : 0
    }
    case 6:
      return view.getInt8(at)
    case 8:
      return view.getInt16(at, little)
    case 9:
      return view.getInt32(at, little)
    case 10: {
      const den = view.getInt32(at + 4, little)
      return den ? view.getInt32(at, little) / den : 0
    }
    case 11:
      return view.getFloat32(at, little)
    case 12:
      return view.getFloat64(at, little)
    default:
      return view.getUint8(at)
  }
}

function readValue(tiff: Tiff, entry: number): RawValue | null {
  const { view, base, little } = tiff
  const type = view.getUint16(entry + 2, little)
  const count = view.getUint32(entry + 4, little)
  const unit = TYPE_SIZE[type]
  if (!unit || count === 0) return null
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
    return { kind: 'text', text: text.trim() }
  }
  if (type === 7) return { kind: 'bytes', bytes: new Uint8Array(view.buffer, view.byteOffset + start, total) }
  const values: number[] = []
  for (let i = 0; i < Math.min(count, MAX_VALUES); i++) values.push(readNumber(tiff, type, start + i * unit))
  return { kind: 'numbers', values, count }
}

interface Ifd {
  tags: Map<number, RawValue>
  next: number
}

function readIfd(tiff: Tiff, offset: number): Ifd {
  const { view, base, little } = tiff
  const tags = new Map<number, RawValue>()
  const start = base + offset
  if (offset <= 0 || start + 2 > view.byteLength) return { tags, next: 0 }
  const count = view.getUint16(start, little)
  for (let i = 0; i < count; i++) {
    const entry = start + 2 + i * 12
    if (entry + 12 > view.byteLength) return { tags, next: 0 }
    const value = readValue(tiff, entry)
    if (value) tags.set(view.getUint16(entry, little), value)
  }
  const nextAt = start + 2 + count * 12
  return { tags, next: nextAt + 4 <= view.byteLength ? view.getUint32(nextAt, little) : 0 }
}

// ---------- שמות תגיות ----------

const IMAGE_TAGS: Record<number, string> = {
  0x0100: 'רוחב תמונה',
  0x0101: 'גובה תמונה',
  0x0102: 'BitsPerSample',
  0x0103: 'דחיסה',
  0x0106: 'PhotometricInterpretation',
  0x010e: 'תיאור',
  0x010f: 'יצרן',
  0x0110: 'דגם',
  0x0112: 'כיוון',
  0x0115: 'SamplesPerPixel',
  0x011a: 'רזולוציה אופקית',
  0x011b: 'רזולוציה אנכית',
  0x011c: 'PlanarConfiguration',
  0x0128: 'יחידת רזולוציה',
  0x0131: 'תוכנה',
  0x0132: 'תאריך שינוי',
  0x013b: 'צלם',
  0x013e: 'WhitePoint',
  0x013f: 'PrimaryChromaticities',
  0x0201: 'JPEGInterchangeFormat',
  0x0202: 'JPEGInterchangeFormatLength',
  0x0211: 'YCbCrCoefficients',
  0x0213: 'YCbCrPositioning',
  0x0214: 'ReferenceBlackWhite',
  0x4746: 'דירוג',
  0x8298: 'זכויות יוצרים',
}

const EXIF_TAGS: Record<number, string> = {
  0x829a: 'זמן חשיפה',
  0x829d: 'צמצם',
  0x8822: 'תוכנית חשיפה',
  0x8824: 'SpectralSensitivity',
  0x8827: 'ISO',
  0x8830: 'SensitivityType',
  0x8832: 'RecommendedExposureIndex',
  0x9000: 'גרסת EXIF',
  0x9003: 'תאריך צילום',
  0x9004: 'תאריך דיגיטציה',
  0x9010: 'OffsetTime',
  0x9011: 'OffsetTimeOriginal',
  0x9012: 'OffsetTimeDigitized',
  0x9101: 'ComponentsConfiguration',
  0x9102: 'CompressedBitsPerPixel',
  0x9201: 'ShutterSpeedValue',
  0x9202: 'ApertureValue',
  0x9203: 'BrightnessValue',
  0x9204: 'פיצוי חשיפה',
  0x9205: 'MaxApertureValue',
  0x9206: 'מרחק לנושא',
  0x9207: 'מצב מדידה',
  0x9208: 'מקור אור',
  0x9209: 'מבזק',
  0x920a: 'אורך מוקד',
  0x9214: 'SubjectArea',
  0x927c: 'נתוני יצרן (MakerNote)',
  0x9286: 'הערת משתמש',
  0x9290: 'SubSecTime',
  0x9291: 'SubSecTimeOriginal',
  0x9292: 'SubSecTimeDigitized',
  0xa000: 'FlashpixVersion',
  0xa001: 'מרחב צבע',
  0xa002: 'רוחב (EXIF)',
  0xa003: 'גובה (EXIF)',
  0xa004: 'RelatedSoundFile',
  0xa20e: 'FocalPlaneXResolution',
  0xa20f: 'FocalPlaneYResolution',
  0xa210: 'FocalPlaneResolutionUnit',
  0xa215: 'ExposureIndex',
  0xa217: 'SensingMethod',
  0xa300: 'FileSource',
  0xa301: 'SceneType',
  0xa302: 'CFAPattern',
  0xa401: 'CustomRendered',
  0xa402: 'מצב חשיפה',
  0xa403: 'איזון לבן',
  0xa404: 'זום דיגיטלי',
  0xa405: 'אורך מוקד (שווה ערך 35 מ״מ)',
  0xa406: 'סוג סצנה',
  0xa407: 'GainControl',
  0xa408: 'ניגודיות',
  0xa409: 'רוויה',
  0xa40a: 'חדות',
  0xa40c: 'SubjectDistanceRange',
  0xa420: 'מזהה תמונה ייחודי',
  0xa430: 'בעלי המצלמה',
  0xa431: 'מספר סידורי של המצלמה',
  0xa432: 'מפרט עדשה',
  0xa433: 'יצרן עדשה',
  0xa434: 'עדשה',
  0xa435: 'מספר סידורי של העדשה',
}

const GPS_TAGS: Record<number, string> = {
  0x00: 'GPSVersionID',
  0x01: 'GPSLatitudeRef',
  0x02: 'קו רוחב',
  0x03: 'GPSLongitudeRef',
  0x04: 'קו אורך',
  0x05: 'GPSAltitudeRef',
  0x06: 'גובה מעל פני הים',
  0x07: 'שעת GPS (UTC)',
  0x08: 'GPSSatellites',
  0x09: 'GPSStatus',
  0x0a: 'GPSMeasureMode',
  0x0b: 'GPSDOP',
  0x0c: 'GPSSpeedRef',
  0x0d: 'GPSSpeed',
  0x0e: 'GPSTrackRef',
  0x0f: 'GPSTrack',
  0x10: 'GPSImgDirectionRef',
  0x11: 'כיוון הצילום',
  0x12: 'GPSMapDatum',
  0x1b: 'GPSProcessingMethod',
  0x1d: 'תאריך GPS',
  0x1f: 'GPSHPositioningError',
}

const INTEROP_TAGS: Record<number, string> = {
  0x0001: 'InteroperabilityIndex',
  0x0002: 'InteroperabilityVersion',
}

const GROUP_TAGS: Record<ExifGroup, Record<number, string>> = {
  image: IMAGE_TAGS,
  thumbnail: IMAGE_TAGS,
  exif: EXIF_TAGS,
  gps: GPS_TAGS,
  interop: INTEROP_TAGS,
}

const EXIF_POINTER = 0x8769
const GPS_POINTER = 0x8825
const INTEROP_POINTER = 0xa005
const POINTERS = new Set([EXIF_POINTER, GPS_POINTER, INTEROP_POINTER])

function tagLabel(group: ExifGroup, tag: number): string {
  const name = GROUP_TAGS[group][tag] ?? `Tag 0x${tag.toString(16).padStart(4, '0')}`
  return group === 'thumbnail' ? `תמונה ממוזערת: ${name}` : name
}

// ---------- עיצוב ערכים ----------

const ENUMS: Partial<Record<ExifGroup, Record<number, Record<number, string>>>> = {
  image: {
    0x0112: {
      1: 'רגיל',
      2: 'היפוך אופקי',
      3: 'סיבוב 180°',
      4: 'היפוך אנכי',
      5: 'היפוך וסיבוב 90°',
      6: 'סיבוב 90° עם כיוון השעון',
      7: 'היפוך וסיבוב 270°',
      8: 'סיבוב 90° נגד כיוון השעון',
    },
    0x0128: { 1: 'ללא', 2: 'אינץ׳', 3: 'סנטימטר' },
  },
  exif: {
    0x8822: { 0: 'לא מוגדר', 1: 'ידני', 2: 'רגיל', 3: 'עדיפות צמצם', 4: 'עדיפות מהירות', 5: 'יצירתי', 6: 'פעולה', 7: 'דיוקן', 8: 'נוף' },
    0x9207: { 0: 'לא ידוע', 1: 'ממוצע', 2: 'משוקלל מרכז', 3: 'נקודתי', 4: 'רב-נקודתי', 5: 'דפוס', 6: 'חלקי', 255: 'אחר' },
    0xa001: { 1: 'sRGB', 65535: 'לא מכויל' },
    0xa402: { 0: 'אוטומטי', 1: 'ידני', 2: 'סדרה אוטומטית' },
    0xa403: { 0: 'אוטומטי', 1: 'ידני' },
    0xa406: { 0: 'רגיל', 1: 'נוף', 2: 'דיוקן', 3: 'לילה' },
  },
}

const round = (n: number, digits = 4): string => String(Math.round(n * 10 ** digits) / 10 ** digits)

function formatBytes(group: ExifGroup, tag: number, bytes: Uint8Array): string {
  const isVersion =
    (group === 'exif' && (tag === 0x9000 || tag === 0xa000)) || (group === 'interop' && tag === 0x0002)
  if (isVersion && bytes.length === 4) {
    const text = ascii(bytes, 0, 4)
    return /^\d{4}$/.test(text) ? `${Number(text.slice(0, 2))}.${text.slice(2)}` : text
  }
  if (group === 'exif' && tag === 0x9286 && bytes.length > 8) {
    // UserComment: 8 בתים ראשונים מציינים קידוד.
    if (ascii(bytes, 0, 5) === 'ASCII') return ascii(bytes, 8, bytes.length - 8).replace(/\0+$/, '').trim()
    if (ascii(bytes, 0, 7) === 'UNICODE') {
      const chars: number[] = []
      for (let i = 8; i + 1 < bytes.length; i += 2) chars.push(bytes[i] | (bytes[i + 1] << 8))
      return String.fromCharCode(...chars).replace(/\0+$/, '').trim()
    }
  }
  const printable = bytes.length <= 64 && bytes.every((b) => b === 0 || (b >= 0x20 && b < 0x7f))
  if (printable) {
    const text = ascii(bytes, 0, bytes.length).replace(/\0+$/, '').trim()
    if (text) return text
  }
  return `${bytes.length} בתים (נתונים בינאריים)`
}

function gpsCoordinate(values: number[], ref: RawValue | undefined): string | null {
  if (values.length < 3) return null
  const degrees = values[0] + values[1] / 60 + values[2] / 3600
  const direction = ref?.kind === 'text' ? ref.text.toUpperCase() : ''
  return `${degrees.toFixed(6)}°${direction ? ` ${direction}` : ''}`
}

function formatNumbers(group: ExifGroup, tag: number, values: number[], count: number, ifd: Ifd): string {
  const first = values[0]
  const named = ENUMS[group]?.[tag]?.[first]
  if (named && count === 1) return named
  if (group === 'exif') {
    if (tag === 0x829a && first > 0) return formatExposure(first)
    if (tag === 0x829d) return `f/${round(first, 1)}`
    if (tag === 0x920a || tag === 0xa405) return `${round(first, 1)} מ״מ`
    if (tag === 0x9209) return first & 1 ? 'הופעל' : 'לא הופעל'
  }
  if (group === 'gps') {
    if (tag === 0x02 || tag === 0x04) {
      const coordinate = gpsCoordinate(values, ifd.tags.get(tag - 1))
      if (coordinate) return coordinate
    }
    if (tag === 0x06) {
      const ref = ifd.tags.get(0x05)
      const below = ref?.kind === 'numbers' && ref.values[0] === 1
      return `${below ? '-' : ''}${round(first, 1)} מ׳`
    }
    if (tag === 0x07 && values.length >= 3) {
      return values.map((v, i) => (i === 2 ? round(v, 2) : String(Math.floor(v))).padStart(2, '0')).join(':')
    }
    if (tag === 0x00) return values.join('.')
  }
  const shown = values.map((v) => round(v)).join(', ')
  return count > values.length ? `${shown}, … (${count} ערכים)` : shown
}

function formatValue(group: ExifGroup, tag: number, value: RawValue, ifd: Ifd): string {
  switch (value.kind) {
    case 'text':
      return value.text
    case 'bytes':
      return formatBytes(group, tag, value.bytes)
    case 'numbers':
      return formatNumbers(group, tag, value.values, value.count, ifd)
  }
}

function toRows(group: ExifGroup, ifd: Ifd): ExifTag[] {
  const rows: ExifTag[] = []
  for (const [tag, value] of ifd.tags) {
    if (group !== 'gps' && group !== 'interop' && POINTERS.has(tag)) continue
    const text = formatValue(group, tag, value, ifd)
    if (text) rows.push({ group, tag, label: tagLabel(group, tag), value: text })
  }
  return rows
}

function pointer(ifd: Ifd, tag: number): number | undefined {
  const value = ifd.tags.get(tag)
  return value?.kind === 'numbers' && value.values[0] > 0 ? value.values[0] : undefined
}

function parseTiff(view: DataView, base: number): ExifTag[] {
  if (base + 8 > view.byteLength) return []
  const order = view.getUint16(base)
  if (order !== 0x4949 && order !== 0x4d4d) return []
  const tiff: Tiff = { view, base, little: order === 0x4949 }
  if (view.getUint16(base + 2, tiff.little) !== 42) return []

  const ifd0 = readIfd(tiff, view.getUint32(base + 4, tiff.little))
  const rows = toRows('image', ifd0)
  const exifAt = pointer(ifd0, EXIF_POINTER)
  if (exifAt !== undefined) {
    const exif = readIfd(tiff, exifAt)
    rows.push(...toRows('exif', exif))
    const interopAt = pointer(exif, INTEROP_POINTER)
    if (interopAt !== undefined) rows.push(...toRows('interop', readIfd(tiff, interopAt)))
  }
  const gpsAt = pointer(ifd0, GPS_POINTER)
  if (gpsAt !== undefined) rows.push(...toRows('gps', readIfd(tiff, gpsAt)))
  if (ifd0.next > 0 && ifd0.next !== view.getUint32(base + 4, tiff.little)) {
    rows.push(...toRows('thumbnail', readIfd(tiff, ifd0.next)))
  }
  return rows
}

/**
 * מחזיר את כל תגיות ה-EXIF בקובץ (מערך ריק אם אין EXIF).
 * זורק שגיאה אם מבנה ה-EXIF פגום כך שלא ניתן לקרוא אותו.
 */
export function readExifTags(bytes: Uint8Array): ExifTag[] {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const base = findTiffOffset(bytes, view)
  return base === null ? [] : parseTiff(view, base)
}

/** קורא את הקובץ פעם אחת ומחלץ מידות ו-EXIF בנפרד: כשל באחד אינו פוגע בשני. */
export async function extractImageDetails(file: Blob): Promise<ImageDetails> {
  const bytes = new Uint8Array(await file.slice(0, READ_BYTES).arrayBuffer())
  let exif: ExifTag[] | null
  try {
    exif = readExifTags(bytes)
  } catch {
    exif = null
  }
  return { size: readImageSize(bytes), exif }
}
