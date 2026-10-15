import { describe, expect, it } from 'vitest'
import { exifRows, extractFileMetadata, formatExposure, readExif, readImageSize } from './metadata'

// ---------- בניית בתים סינתטיים (ללא קבצים אמיתיים) ----------

function pngBytes(width: number, height: number): Uint8Array {
  const bytes = new Uint8Array(33)
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  bytes.set([0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52], 8)
  const view = new DataView(bytes.buffer)
  view.setUint32(16, width)
  view.setUint32(20, height)
  return bytes
}

function gifBytes(width: number, height: number): Uint8Array {
  const bytes = new Uint8Array(13)
  bytes.set([0x47, 0x49, 0x46, 0x38, 0x39, 0x61])
  const view = new DataView(bytes.buffer)
  view.setUint16(6, width, true)
  view.setUint16(8, height, true)
  return bytes
}

const ascii = (text: string) => [...text].map((c) => c.charCodeAt(0))

/** סגמנט SOF0 של JPEG. */
function sof0(width: number, height: number): number[] {
  return [0xff, 0xc0, 0, 17, 8, height >> 8, height & 255, width >> 8, width & 255, 3, 1, 0x22, 0, 2, 0x11, 1, 3, 0x11, 1]
}

interface IfdEntry {
  tag: number
  type: number
  count: number
  /** בתים של הערך. אם ארוכים מ-4 הם נכתבים באזור הנתונים. */
  data: number[]
}

const u16 = (n: number) => [n & 255, n >> 8]
const u32 = (n: number) => [n & 255, (n >> 8) & 255, (n >> 16) & 255, (n >>> 24) & 255]
const rational = (num: number, den: number) => [...u32(num), ...u32(den)]
const text = (s: string): IfdEntry['data'] => [...ascii(s), 0]

/** בונה בלוק TIFF (little-endian) עם IFD0, Exif IFD ו-GPS IFD. */
function buildTiff(ifd0: IfdEntry[], exif: IfdEntry[], gps: IfdEntry[]): number[] {
  const out: number[] = [...ascii('II'), ...u16(42), ...u32(8)]
  const ifdSize = (n: number) => 2 + n * 12 + 4
  const pointers: IfdEntry[] = []
  if (exif.length) pointers.push({ tag: 0x8769, type: 4, count: 1, data: [] })
  if (gps.length) pointers.push({ tag: 0x8825, type: 4, count: 1, data: [] })

  const layouts = [
    { entries: [...ifd0, ...pointers] },
    { entries: exif },
    { entries: gps },
  ].filter((l) => l.entries.length)

  let cursor = 8
  const ifdOffsets = layouts.map((l) => {
    const at = cursor
    cursor += ifdSize(l.entries.length)
    return at
  })
  // אזור נתונים מיד אחרי כל ה-IFDs
  const blob: number[] = []
  const dataStart = cursor
  const encode = (entries: IfdEntry[], pointerValues: Record<number, number>) => {
    const bytes: number[] = [...u16(entries.length)]
    for (const entry of entries) {
      bytes.push(...u16(entry.tag), ...u16(entry.type), ...u32(entry.count))
      if (entry.tag in pointerValues) {
        bytes.push(...u32(pointerValues[entry.tag]))
      } else if (entry.data.length <= 4) {
        bytes.push(...entry.data, ...new Array(4 - entry.data.length).fill(0))
      } else {
        bytes.push(...u32(dataStart + blob.length))
        blob.push(...entry.data)
      }
    }
    bytes.push(0, 0, 0, 0)
    return bytes
  }
  const pointerValues: Record<number, number> = {}
  if (exif.length) pointerValues[0x8769] = ifdOffsets[1]
  if (gps.length) pointerValues[0x8825] = ifdOffsets[exif.length ? 2 : 1]
  layouts.forEach((l, i) => out.push(...encode(l.entries, i === 0 ? pointerValues : {})))
  out.push(...blob)
  return out
}

function jpegWithExif(tiff: number[], width = 4000, height = 3000): Uint8Array {
  const payload = [...ascii('Exif'), 0, 0, ...tiff]
  const app1 = [0xff, 0xe1, ...[(payload.length + 2) >> 8, (payload.length + 2) & 255], ...payload]
  return new Uint8Array([0xff, 0xd8, ...app1, ...sof0(width, height), 0xff, 0xd9])
}

const sampleTiff = () =>
  buildTiff(
    [
      { tag: 0x010f, type: 2, count: 6, data: text('Canon') },
      { tag: 0x0110, type: 2, count: 9, data: text('EOS R100') },
      { tag: 0x0112, type: 3, count: 1, data: u16(6) },
    ],
    [
      { tag: 0x829a, type: 5, count: 1, data: rational(1, 250) },
      { tag: 0x829d, type: 5, count: 1, data: rational(28, 10) },
      { tag: 0x8827, type: 3, count: 1, data: u16(400) },
      { tag: 0x9003, type: 2, count: 20, data: text('2026:03:01 10:20:30') },
      { tag: 0x920a, type: 5, count: 1, data: rational(50, 1) },
    ],
    [
      { tag: 1, type: 2, count: 2, data: text('N') },
      { tag: 2, type: 5, count: 3, data: [...rational(32, 1), ...rational(30, 1), ...rational(0, 1)] },
      { tag: 3, type: 2, count: 2, data: text('W') },
      { tag: 4, type: 5, count: 3, data: [...rational(34, 1), ...rational(45, 1), ...rational(0, 1)] },
    ],
  )

// ---------- בדיקות ----------

describe('readImageSize', () => {
  it('reads PNG and GIF dimensions', () => {
    expect(readImageSize(pngBytes(640, 480))).toEqual({ width: 640, height: 480 })
    expect(readImageSize(gifBytes(32, 16))).toEqual({ width: 32, height: 16 })
  })

  it('reads JPEG dimensions after other segments', () => {
    expect(readImageSize(jpegWithExif(sampleTiff(), 4000, 3000))).toEqual({ width: 4000, height: 3000 })
  })

  it('returns null for unknown, empty or truncated data', () => {
    expect(readImageSize(new Uint8Array(0))).toBeNull()
    expect(readImageSize(new Uint8Array(40))).toBeNull()
    expect(readImageSize(pngBytes(1, 1).subarray(0, 12))).toBeNull()
    expect(readImageSize(new Uint8Array([0xff, 0xd8, 0xff]))).toBeNull()
  })
})

describe('readExif', () => {
  it('extracts camera, exposure, date and GPS data', () => {
    const exif = readExif(jpegWithExif(sampleTiff()))
    expect(exif).toMatchObject({
      make: 'Canon',
      model: 'EOS R100',
      orientation: 6,
      exposureTime: 1 / 250,
      fNumber: 2.8,
      iso: 400,
      dateTaken: '2026:03:01 10:20:30',
      focalLength: 50,
    })
    expect(exif?.gps?.latitude).toBeCloseTo(32.5)
    expect(exif?.gps?.longitude).toBeCloseTo(-34.75)
  })

  it('returns null when there is no EXIF or the data is corrupted', () => {
    expect(readExif(new Uint8Array([0xff, 0xd8, ...sof0(1, 1), 0xff, 0xd9]))).toBeNull()
    expect(readExif(pngBytes(1, 1))).toBeNull()
    const truncated = jpegWithExif(sampleTiff()).subarray(0, 40)
    expect(() => readExif(truncated)).not.toThrow()
  })
})

describe('extractFileMetadata', () => {
  it('combines size and EXIF from a File', async () => {
    const file = new File([jpegWithExif(sampleTiff()) as BlobPart], 'photo.jpg', { type: 'image/jpeg' })
    const metadata = await extractFileMetadata(file)
    expect(metadata.size).toEqual({ width: 4000, height: 3000 })
    expect(metadata.exif?.make).toBe('Canon')
  })

  it('returns an empty result for non-image content', async () => {
    const metadata = await extractFileMetadata(new File(['hello world'], 'a.txt'))
    expect(metadata).toEqual({})
  })
})

describe('exifRows', () => {
  it('formats only the available values', () => {
    const rows = exifRows({ make: 'Canon', model: 'R100', exposureTime: 1 / 250, fNumber: 2.8, iso: 400 })
    expect(rows).toEqual([
      { label: 'מצלמה', value: 'Canon R100' },
      { label: 'חשיפה', value: '1/250 שנ׳' },
      { label: 'צמצם', value: 'f/2.8' },
      { label: 'ISO', value: '400' },
    ])
    expect(exifRows({})).toEqual([])
    expect(formatExposure(2)).toBe('2 שנ׳')
  })
})
