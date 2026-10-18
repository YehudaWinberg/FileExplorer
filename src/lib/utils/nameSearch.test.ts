import { describe, expect, it } from 'vitest'
import type { FileSystemEntry } from '../models/entry'
import { filterByName, matchesName, normalizeQuery } from './nameSearch'

const file = (name: string): FileSystemEntry => ({ id: name, name, kind: 'file', extension: '' })
const folder = (name: string): FileSystemEntry => ({ id: name, name, kind: 'folder', extension: '' })

// סדר המקור: קודם הקבצים ואחר כך התיקיות.
const entries = [
  file('Report.pdf'),
  file('AnnualReport.xlsx'),
  file('photo.jpg'),
  file('PHOTO-final.png'),
  file('aba.txt'),
  file('notes.txt'),
  folder('Reports'),
  folder('Images'),
  folder('ABA-Folder'),
]
const names = (query: string) => filterByName(entries, query).map((e) => e.name)

describe('filterByName', () => {
  it('matches part of the name anywhere, keeping the original order', () => {
    expect(names('repo')).toEqual(['Report.pdf', 'AnnualReport.xlsx', 'Reports'])
  })

  it('ignores letter case', () => {
    expect(names('ABA')).toEqual(['aba.txt', 'ABA-Folder'])
    expect(names('photo')).toEqual(['photo.jpg', 'PHOTO-final.png'])
  })

  it('includes folders', () => {
    expect(names('ima')).toEqual(['Images'])
  })

  it('returns nothing when no name matches', () => {
    expect(names('xyz123')).toEqual([])
  })

  it('returns every entry for an empty or whitespace-only query', () => {
    expect(filterByName(entries, '')).toBe(entries)
    expect(filterByName(entries, '   ')).toBe(entries)
  })

  it('ignores spaces around the query but not inside it', () => {
    expect(names('  repo  ')).toEqual(names('repo'))
    expect(names('re po')).toEqual([])
  })

  it('does not change the entries themselves', () => {
    const [first] = filterByName(entries, 'REPORT')
    expect(first).toBe(entries[0])
    expect(first.name).toBe('Report.pdf')
  })
})

describe('matchesName / normalizeQuery', () => {
  it('normalizes the query and matches by name only', () => {
    expect(normalizeQuery('  AbC ')).toBe('abc')
    expect(matchesName({ ...file('a.txt'), extension: 'pdf' }, 'pdf')).toBe(false)
  })
})
