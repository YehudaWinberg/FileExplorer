import { describe, expect, it } from 'vitest'
import { normalizePattern, sameLocation, type FolderRef } from './entry'

const root: FolderRef = { id: 'r1', name: 'A', parent: null }
const other: FolderRef = { id: 'r2', name: 'B', parent: null }

describe('sameLocation with search', () => {
  it('compares root id and the normalized pattern', () => {
    expect(sameLocation({ type: 'search', root, pattern: ' Report ' }, { type: 'search', root, pattern: 'report' })).toBe(true)
    expect(sameLocation({ type: 'search', root, pattern: 'a' }, { type: 'search', root, pattern: 'b' })).toBe(false)
    expect(sameLocation({ type: 'search', root, pattern: 'a' }, { type: 'search', root: other, pattern: 'a' })).toBe(false)
  })

  it('never equals another location type', () => {
    expect(sameLocation({ type: 'search', root, pattern: 'a' }, { type: 'folder', folder: root })).toBe(false)
    expect(sameLocation({ type: 'home' }, { type: 'home' })).toBe(true)
    expect(sameLocation({ type: 'home' }, { type: 'pc' })).toBe(false)
  })

  it('normalizePattern trims and lowercases', () => {
    expect(normalizePattern('  ABC ')).toBe('abc')
  })
})
