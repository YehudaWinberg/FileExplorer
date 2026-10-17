import { describe, expect, it } from 'vitest'
import { extractImageDetails, readExifTags } from './exifTags'
import { relativePath, type FolderRef } from './models/entry'
import { formatSizeMb } from './utils/format'
import { getOpenWithApp } from './utils/openWith'
import { jpegWithExif, png, pngChunk, tiff } from './testFixtures'

describe('readExifTags', () => {
  it('reads every tag from a JPEG APP1 block, with readable labels and values', () => {
    expect(readExifTags(jpegWithExif())).toEqual([
      { group: 'image', tag: 0x010f, label: 'יצרן', value: 'Canon' },
      { group: 'image', tag: 0x0110, label: 'דגם', value: 'EOS' },
      { group: 'image', tag: 0x0112, label: 'כיוון', value: 'סיבוב 90° עם כיוון השעון' },
    ])
  })

  it('reads EXIF from a PNG eXIf chunk', () => {
    expect(readExifTags(png(pngChunk('eXIf', tiff()))).map((t) => t.value)).toContain('Canon')
  })

  it('returns an empty list when the image has no EXIF', () => {
    expect(readExifTags(png())).toEqual([])
    expect(readExifTags(new Uint8Array([1, 2, 3]))).toEqual([])
  })
})

describe('extractImageDetails', () => {
  it('returns dimensions and EXIF independently', async () => {
    await expect(extractImageDetails(new Blob([png() as BlobPart]))).resolves.toEqual({
      size: { width: 10, height: 20 },
      exif: [],
    })
    const details = await extractImageDetails(new Blob([jpegWithExif() as BlobPart]))
    expect(details.size).toEqual({ width: 40, height: 30 })
    expect(details.exif).toHaveLength(3)
  })
})

describe('getOpenWithApp', () => {
  it('maps known extensions and hides unknown ones', () => {
    expect(getOpenWithApp('pdf')).toBe('Adobe Acrobat Reader')
    expect(getOpenWithApp('DOCX')).toBe('Microsoft Word')
    expect(getOpenWithApp('xyz')).toBeUndefined()
    expect(getOpenWithApp('')).toBeUndefined()
  })
})

describe('relativePath', () => {
  const root: FolderRef = { id: 'r', name: 'Root', parent: null }
  const docs: FolderRef = { id: 'r/Documents', name: 'Documents', parent: root }

  it('is relative to the picked root folder', () => {
    expect(relativePath(root, 'a.txt')).toBe('a.txt')
    expect(relativePath(docs, 'Report.pdf')).toBe('Documents/Report.pdf')
  })
})

describe('formatSizeMb', () => {
  it('always uses MB', () => {
    expect(formatSizeMb(0)).toBe('0 MB')
    expect(formatSizeMb(1024 * 1024 * 2.5)).toBe('2.5 MB')
    expect(formatSizeMb(100)).toBe('פחות מ-0.01 MB')
  })
})
