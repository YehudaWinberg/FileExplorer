import { describe, expect, it } from 'vitest'
import type { FileSystemEntry } from '../models/entry'
import { getExtension, getFileKind, getTypeLabel } from './fileTypes'
import { formatElapsedDays, formatSize } from './format'
import { SCALE_GRADIENT, isLargeFile, scaleColor, SCALE_STEPS, sizeScalePosition, sizeScaleStep } from './largeFiles'
import { sortEntries } from './sortEntries'
import { filterByTypes, getTypeOptions } from './typeFilter'

function entry(name: string, kind: 'file' | 'folder', extra: Partial<FileSystemEntry> = {}): FileSystemEntry {
  return { id: name, name, kind, extension: kind === 'file' ? getExtension(name) : '', ...extra }
}

describe('fileTypes', () => {
  it('extracts lowercase extensions', () => {
    expect(getExtension('Report.PDF')).toBe('pdf')
    expect(getExtension('archive.tar.gz')).toBe('gz')
    expect(getExtension('README')).toBe('')
    expect(getExtension('trailing.')).toBe('')
  })

  it('maps known and unknown types', () => {
    expect(getFileKind(entry('a.docx', 'file'))).toBe('word')
    expect(getTypeLabel(entry('a.docx', 'file'))).toBe('מסמך Word')
    expect(getTypeLabel(entry('a.xyz', 'file'))).toBe('קובץ XYZ')
    expect(getTypeLabel(entry('LICENSE', 'file'))).toBe('קובץ')
    expect(getTypeLabel(entry('dir', 'folder'))).toBe('תיקיית קבצים')
  })
})

describe('typeFilter', () => {
  const entries = [
    entry('a.pdf', 'file'),
    entry('b.png', 'file'),
    entry('c.jpg', 'file'),
    entry('d.png', 'file'),
    entry('dir', 'folder'),
  ]

  it('lists each existing type once (JPEG and PNG separately)', () => {
    const options = getTypeOptions(entries)
    expect(options).toHaveLength(4)
    expect(options).toEqual(expect.arrayContaining(['מסמך PDF', 'תמונת PNG', 'תמונת JPEG', 'תיקיית קבצים']))
  })

  it('returns everything when no type is selected', () => {
    expect(filterByTypes(entries, [])).toBe(entries)
  })

  it('filters by one or several types, including folders only', () => {
    expect(filterByTypes(entries, ['תמונת PNG']).map((e) => e.name)).toEqual(['b.png', 'd.png'])
    expect(filterByTypes(entries, ['תמונת PNG', 'מסמך PDF']).map((e) => e.name)).toEqual(['a.pdf', 'b.png', 'd.png'])
    expect(filterByTypes(entries, ['תיקיית קבצים']).map((e) => e.name)).toEqual(['dir'])
  })
})

describe('formatSize', () => {
  it('formats sizes Windows-style', () => {
    expect(formatSize(undefined)).toBe('')
    expect(formatSize(0)).toBe('0 KB')
    expect(formatSize(1)).toBe('1 KB')
    expect(formatSize(1025)).toBe('2 KB')
    expect(formatSize(5 * 1024 * 1024)).toBe('5 MB')
  })
})

describe('formatElapsedDays', () => {
  const now = new Date(2026, 9, 16, 12, 0).getTime()
  const at = (day: number, hour = 12) => new Date(2026, 9, day, hour, 0).getTime()

  it('returns "היום" for a change made today', () => {
    expect(formatElapsedDays(at(16, 0), now)).toBe('היום')
    expect(formatElapsedDays(at(16, 11), now)).toBe('היום')
  })

  it('returns "אתמול" by calendar day, not 24 hours', () => {
    expect(formatElapsedDays(at(15), now)).toBe('אתמול')
    expect(formatElapsedDays(new Date(2026, 9, 15, 23, 59).getTime(), new Date(2026, 9, 16, 0, 1).getTime())).toBe('אתמול')
  })

  it('returns the number of days for older changes', () => {
    expect(formatElapsedDays(at(14), now)).toBe('2 ימים')
    expect(formatElapsedDays(new Date(2026, 8, 16, 12, 0).getTime(), now)).toBe('30 ימים')
  })

  it('returns empty string when there is no modified date', () => {
    expect(formatElapsedDays(undefined, now)).toBe('')
  })
})

describe('sortEntries', () => {
  const entries = [
    entry('b.txt', 'file', { size: 10, modified: 2 }),
    entry('a.txt', 'file', { size: 30, modified: 1 }),
    entry('zeta', 'folder'),
    entry('alpha', 'folder'),
  ]

  it('keeps folders first regardless of direction', () => {
    for (const direction of ['asc', 'desc'] as const) {
      const sorted = sortEntries(entries, { key: 'name', direction })
      expect(sorted.slice(0, 2).every((e) => e.kind === 'folder')).toBe(true)
    }
  })

  it('sorts by name ascending and descending', () => {
    expect(sortEntries(entries, { key: 'name', direction: 'asc' }).map((e) => e.name)).toEqual(['alpha', 'zeta', 'a.txt', 'b.txt'])
    expect(sortEntries(entries, { key: 'name', direction: 'desc' }).map((e) => e.name)).toEqual(['zeta', 'alpha', 'b.txt', 'a.txt'])
  })

  it('sorts files by size and modified date', () => {
    expect(sortEntries(entries, { key: 'size', direction: 'desc' }).slice(2).map((e) => e.name)).toEqual(['a.txt', 'b.txt'])
    expect(sortEntries(entries, { key: 'modified', direction: 'asc' }).slice(2).map((e) => e.name)).toEqual(['a.txt', 'b.txt'])
  })

  it('sorts by elapsed time: newest first when ascending', () => {
    expect(sortEntries(entries, { key: 'elapsed', direction: 'asc' }).slice(2).map((e) => e.name)).toEqual(['b.txt', 'a.txt'])
    expect(sortEntries(entries, { key: 'elapsed', direction: 'desc' }).slice(2).map((e) => e.name)).toEqual(['a.txt', 'b.txt'])
  })

  it('does not mutate the input', () => {
    const copy = [...entries]
    sortEntries(entries, { key: 'size', direction: 'asc' })
    expect(entries).toEqual(copy)
  })
})

describe('largeFiles', () => {
  const MB = 1024 * 1024

  it('treats images as large only above 10MB', () => {
    expect(isLargeFile(entry('a.png', 'file', { size: 10 * MB }))).toBe(false)
    expect(isLargeFile(entry('a.png', 'file', { size: 10 * MB + 1 }))).toBe(true)
  })

  it('treats other files as large only above 50MB, and folders never', () => {
    expect(isLargeFile(entry('a.zip', 'file', { size: 50 * MB }))).toBe(false)
    expect(isLargeFile(entry('a.zip', 'file', { size: 50 * MB + 1 }))).toBe(true)
    expect(isLargeFile(entry('dir', 'folder'))).toBe(false)
    expect(isLargeFile(entry('a.zip', 'file'))).toBe(false)
  })

  it('maps size to a clamped position from 0 to 1', () => {
    expect(sizeScalePosition(0)).toBe(0)
    expect(sizeScalePosition(512 * MB)).toBeCloseTo(0.5, 1)
    expect(sizeScalePosition(1024 * MB)).toBe(1)
    expect(sizeScalePosition(5 * 1024 * MB)).toBe(1)
  })

  it('splits the 0..1GB range into 102 steps of 10MB', () => {
    expect(SCALE_STEPS).toBe(102)
    expect(sizeScaleStep(10 * MB - 1)).toBe(0)
    expect(sizeScaleStep(10 * MB)).toBe(1)
    expect(sizeScaleStep(25 * MB)).toBe(2)
    expect(sizeScaleStep(1019 * MB)).toBe(101)
    expect(sizeScaleStep(1020 * MB)).toBe(102)
  })

  it('goes from soft green on the left to strong red on the right', () => {
    expect(scaleColor(0)).toBe('hsl(120 35% 65%)')
    expect(scaleColor(0.5)).toBe('hsl(60 63% 55%)')
    expect(scaleColor(1)).toBe('hsl(0 90% 45%)')
    expect(SCALE_GRADIENT.startsWith('linear-gradient(to right, hsl(120')).toBe(true)
    expect(SCALE_GRADIENT.endsWith('hsl(0 90% 45%))')).toBe(true)
  })
})
