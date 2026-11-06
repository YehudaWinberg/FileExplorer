import { promises as fs, mkdirSync, mkdtempSync, rmSync, symlinkSync, utimesSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { findRecentChanges, MAX_RESULTS, PathError } from './findRecentChanges.mjs'

const HOUR = 3600 * 1000
let base, root, outside
const now = Date.now()

function put(rel, { ageHours = 1, size = 10 } = {}) {
  const full = path.join(root, rel)
  mkdirSync(path.dirname(full), { recursive: true })
  writeFileSync(full, Buffer.alloc(size))
  const t = new Date(now - ageHours * HOUR)
  utimesSync(full, t, t)
}

beforeEach(() => {
  base = mkdtempSync(path.join(tmpdir(), 'fe-mcp-'))
  root = path.join(base, 'root')
  outside = path.join(base, 'outside')
  mkdirSync(root)
  mkdirSync(outside)
})
afterEach(() => {
  vi.restoreAllMocks()
  rmSync(base, { recursive: true, force: true })
})

describe('findRecentChanges', () => {
  it('returns files in range, newest first, relative paths', async () => {
    put('a.txt', { ageHours: 10 })
    put('sub/b.txt', { ageHours: 2 })
    put('old.txt', { ageHours: 100 })
    const r = await findRecentChanges(root, { hours: 72, now })
    expect(r.files.map((f) => f.path)).toEqual(['sub/b.txt', 'a.txt'])
    expect(r.truncated).toBe(false)
  })

  it('filters by type', async () => {
    put('a.docx', { ageHours: 5 })
    put('b.doc', { ageHours: 5 })
    put('c.xlsx', { ageHours: 5 })
    put('d.docx', { ageHours: 60 })
    const r = await findRecentChanges(root, { hours: 48, type: 'word', now })
    expect(r.files.map((f) => f.path).sort()).toEqual(['a.docx', 'b.doc'])
  })

  it('filters by minimum size', async () => {
    put('big.bin', { ageHours: 3, size: 3 * 1024 * 1024 })
    put('small.bin', { ageHours: 3, size: 100 })
    const r = await findRecentChanges(root, { hours: 24, minSizeMB: 2, now })
    expect(r.files.map((f) => f.path)).toEqual(['big.bin'])
  })

  it('skips node_modules and .git', async () => {
    put('node_modules/x.js')
    put('.git/y')
    put('ok.js')
    const r = await findRecentChanges(root, { hours: 24, now })
    expect(r.files.map((f) => f.path)).toEqual(['ok.js'])
  })

  it('caps at 200 and flags truncated', async () => {
    for (let i = 0; i < MAX_RESULTS + 5; i++) put(`f${i}.txt`)
    const r = await findRecentChanges(root, { hours: 24, now })
    expect(r.files).toHaveLength(MAX_RESULTS)
    expect(r.total).toBe(MAX_RESULTS + 5)
    expect(r.truncated).toBe(true)
  })

  it('searches within a valid subfolder', async () => {
    put('in/a.txt')
    put('other/b.txt')
    const r = await findRecentChanges(root, { hours: 24, subfolder: 'in', now })
    expect(r.files.map((f) => f.path)).toEqual(['in/a.txt'])
  })

  it('rejects escaping subfolders', async () => {
    await expect(findRecentChanges(root, { hours: 1, subfolder: '../..' })).rejects.toBeInstanceOf(PathError)
    await expect(findRecentChanges(root, { hours: 1, subfolder: outside })).rejects.toBeInstanceOf(PathError)
    await expect(findRecentChanges(root, { hours: 1, subfolder: '../outside' })).rejects.toBeInstanceOf(PathError)
  })

  it('rejects a missing subfolder without crashing', async () => {
    await expect(findRecentChanges(root, { hours: 1, subfolder: 'nope' })).rejects.toBeInstanceOf(PathError)
  })

  it('accepts a subfolder whose name starts with two dots', async () => {
    put('..cache/a.txt')
    const r = await findRecentChanges(root, { hours: 24, subfolder: '..cache', now })
    expect(r.files.map((f) => f.path)).toEqual(['..cache/a.txt'])
  })

  it('rejects a symlink pointing outside and skips symlinks in the scan', async (ctx) => {
    const secret = path.join(outside, 'secret.txt')
    writeFileSync(secret, 'x')
    const t = new Date(now - HOUR)
    utimesSync(secret, t, t)
    try {
      symlinkSync(outside, path.join(root, 'link'), 'junction')
    } catch {
      ctx.skip()
      return
    }
    put('real.txt')
    await expect(findRecentChanges(root, { hours: 24, subfolder: 'link' })).rejects.toBeInstanceOf(PathError)
    const r = await findRecentChanges(root, { hours: 24, now })
    expect(r.files.map((f) => f.path)).toEqual(['real.txt'])
  })

  it('skips an unreadable directory and counts it', async () => {
    put('ok.txt')
    put('locked/hidden.txt')
    const realReaddir = fs.readdir.bind(fs)
    vi.spyOn(fs, 'readdir').mockImplementation(async (dir, ...rest) => {
      if (path.basename(String(dir)) === 'locked') throw Object.assign(new Error('denied'), { code: 'EACCES' })
      return realReaddir(dir, ...rest)
    })
    const r = await findRecentChanges(root, { hours: 24, now })
    expect(r.skipped).toBeGreaterThanOrEqual(1)
    expect(r.files.map((f) => f.path)).toEqual(['ok.txt'])
  })

  it('reports a missing root as an error', async () => {
    await expect(findRecentChanges(path.join(base, 'missing'), { hours: 1 })).rejects.toBeInstanceOf(PathError)
  })
})
