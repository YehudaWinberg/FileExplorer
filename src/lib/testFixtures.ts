/** בוני בתים סינתטיים של תמונות ו-PDF לבדיקות (ללא קבצים אמיתיים). */

const ascii = (text: string) => [...text].map((c) => c.charCodeAt(0))
const u16 = (n: number) => [n & 255, n >> 8]
const u32 = (n: number) => [n & 255, (n >> 8) & 255, (n >> 16) & 255, (n >>> 24) & 255]

/** TIFF (little-endian) עם IFD0: Make=make (מחוץ לרשומה), Model="EOS" (בתוך הרשומה) ו-Orientation=6. */
export function tiff(make = 'Canon'): number[] {
  const dataAt = 8 + 2 + 3 * 12 + 4
  return [
    ...ascii('II'), ...u16(42), ...u32(8),
    ...u16(3),
    ...u16(0x010f), ...u16(2), ...u32(make.length + 1), ...u32(dataAt),
    ...u16(0x0110), ...u16(2), ...u32(4), ...ascii('EOS'), 0,
    ...u16(0x0112), ...u16(3), ...u32(1), ...u16(6), 0, 0,
    ...u32(0),
    ...ascii(make), 0,
  ]
}

/** JPEG בגודל 40×30 עם בלוק EXIF. make חייב להיות באורך 4 תווים לפחות. */
export function jpegWithExif(make = 'Canon'): Uint8Array {
  const block = [...ascii('Exif'), 0, 0, ...tiff(make)]
  const sof0 = [0xff, 0xc0, 0, 17, 8, 0, 30, 0, 40, 3, 1, 0x22, 0, 2, 0x11, 1, 3, 0x11, 1]
  const length = block.length + 2
  return new Uint8Array([0xff, 0xd8, 0xff, 0xe1, length >> 8, length & 255, ...block, ...sof0, 0xff, 0xd9])
}

export function pngChunk(type: string, data: number[]): number[] {
  return [0, 0, data.length >> 8, data.length & 255, ...ascii(type), ...data, 0, 0, 0, 0]
}

/** PNG בגודל 10×20, ללא EXIF אלא אם הועברו chunks נוספים. */
export function png(extra: number[] = []): Uint8Array {
  const ihdr = [0, 0, 0, 10, 0, 0, 0, 20, 8, 6, 0, 0, 0]
  return new Uint8Array([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    ...pngChunk('IHDR', ihdr),
    ...extra,
    ...pngChunk('IEND', []),
  ])
}

/** PDF מינימלי עם מספר העמודים המבוקש (אובייקטי /Type /Page גלויים בטקסט). */
export function pdf(pages = 1, padding = 0): Uint8Array {
  const kids = Array.from({ length: pages }, (_, i) => `${i + 3} 0 R`).join(' ')
  const leaves = Array.from({ length: pages }, (_, i) => `${i + 3} 0 obj\n<< /Type /Page /Parent 2 0 R >>\nendobj\n`).join('')
  const filler = padding > 0 ? `% ${'x'.repeat(padding)}\n` : ''
  const text =
    `%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n` +
    `2 0 obj\n<< /Type /Pages /Kids [${kids}] /Count ${pages} >>\nendobj\n${leaves}${filler}` +
    `trailer\n<< /Root 1 0 R >>\nstartxref\n0\n%%EOF\n`
  return new Uint8Array(ascii(text))
}
