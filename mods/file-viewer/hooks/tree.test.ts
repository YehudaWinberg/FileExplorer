import { expect, test } from 'claude-code/testing'

import { baseName, flatten, formatKb, joinPath, loadListing, visibleSorted } from './tree'

const entry = (name: string, kind: 'file' | 'dir' | 'other', size = 0) => ({
  name,
  kind,
  size,
  mtimeMs: 0,
  isLink: false,
})

test('folders come first, then files, and .git and node_modules are hidden', () => {
  const sorted = visibleSorted([
    entry('b.txt', 'file', 10),
    entry('.git', 'dir'),
    entry('src', 'dir'),
    entry('node_modules', 'dir'),
    entry('a.txt', 'file', 20),
  ])

  expect(sorted.map(one => one.name)).toEqual(['src', 'a.txt', 'b.txt'])
})

test('file sizes are shown in KB', () => {
  expect(formatKb(2048)).toBe('2.0 KB')
})

test('the pane title and paths follow the root, not a hard-coded path', () => {
  const win = (path: string) => path.split('|').join(String.fromCharCode(92))

  expect(baseName(win('C:|work|FileExplorer'))).toBe('FileExplorer')
  expect(baseName('/home/me/FileExplorer/')).toBe('FileExplorer')
  expect(joinPath(win('C:|work'), 'src')).toBe(win('C:|work|src'))
  expect(joinPath('/home/me', 'src')).toBe('/home/me/src')
})

test('a folder shows its children only once it is open', () => {
  const listings = {
    '/r': { entries: [{ name: 'src', kind: 'dir' as const, size: 0 }] },
    '/r/src': { entries: [{ name: 'a.ts', kind: 'file' as const, size: 1024 }] },
  }

  expect(flatten('/r', [], listings).map(row => row.path)).toEqual(['/r/src'])
  expect(flatten('/r', ['/r/src'], listings).map(row => row.path)).toEqual([
    '/r/src',
    '/r/src/a.ts',
  ])
})

test('a failed read gives a short error instead of a partial tree', async () => {
  const listing = await loadListing(async () => {
    throw new Error('EACCES: permission denied')
  }, '/r')

  expect(listing).toEqual({ error: 'Cannot read folder: EACCES: permission denied' })
  expect(flatten('/r', [], { '/r': listing })).toEqual([
    { kind: 'error', path: '/r', depth: 0, message: 'Cannot read folder: EACCES: permission denied' },
  ])
})
