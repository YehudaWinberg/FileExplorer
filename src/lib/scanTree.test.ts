import { describe, expect, it } from 'vitest'
import { FsError, type FileSystemAdapter } from './fileSystem'
import type { FileSystemEntry, FolderRef } from './models/entry'
import { scanTree, SKIP_DIRS, type SearchResult } from './scanTree'
import { compilePattern } from './utils/pattern'

type Fail = 'permission' | 'not-found' | 'unknown'
type Node = string | { dir: string; children: Node[]; fail?: Fail }
type Tree = { children: Node[]; fail?: Fail }

/** adapter בזיכרון לעץ סינתטי; מממש רק listNames וסופר קריאות. */
function memoryAdapter(rootNode: Tree) {
  const dirs = new Map<string, Tree>([['root', rootNode]])
  const calls: string[] = []
  const adapter = {
    async listNames(folder: FolderRef): Promise<FileSystemEntry[]> {
      calls.push(folder.id)
      const dir = dirs.get(folder.id)
      if (!dir) throw new FsError('not-found', 'x')
      if (dir.fail) throw new FsError(dir.fail, 'x')
      return dir.children.map((node): FileSystemEntry => {
        const name = typeof node === 'string' ? node : node.dir
        const id = `${folder.id}/${name}`
        if (typeof node === 'string') {
          const dot = name.lastIndexOf('.')
          return { id, name, kind: 'file', extension: dot > 0 ? name.slice(dot + 1).toLowerCase() : '' }
        }
        dirs.set(id, node)
        return { id, name, kind: 'folder', extension: '', folder: { id, name, parent: folder } }
      })
    },
  } as unknown as FileSystemAdapter
  const root: FolderRef = { id: 'root', name: 'root', parent: null }
  return { adapter, root, calls }
}

async function collect(gen: AsyncGenerator<SearchResult>): Promise<SearchResult[]> {
  const out: SearchResult[] = []
  for await (const r of gen) out.push(r)
  return out
}

function run(tree: Tree, pattern: string, signal: AbortSignal = new AbortController().signal) {
  const { adapter, root, calls } = memoryAdapter(tree)
  return { gen: scanTree(adapter, root, compilePattern(pattern), signal), root, calls }
}
const ids = (results: SearchResult[]) => results.map((r) => r.entry.id)

const deep: Tree = {
  children: [
    'a.txt',
    {
      dir: 'l1',
      children: [
        'b.txt',
        { dir: 'l2', children: ['c.txt', { dir: 'l3', children: [{ dir: 'l4', children: ['e.txt'] }, 'd.txt'] }] },
      ],
    },
  ],
}

describe('scanTree', () => {
  it('yields one result per match with depth 1 for direct children', async () => {
    const { gen, root } = run(deep, '*.txt')
    const results = await collect(gen)
    expect(results[0]).toEqual({ entry: expect.objectContaining({ name: 'a.txt' }), parent: root, depth: 1, score: 95 })
    expect(results).toHaveLength(5)
  })

  it('finds a file at depth 5 and orders results shallow before deep (BFS)', async () => {
    const results = await collect(run(deep, '*.txt').gen)
    expect(results.map((r) => r.depth)).toEqual([1, 2, 3, 4, 5])
    expect(results.at(-1)?.entry.name).toBe('e.txt')
  })

  it('returns shallow items before deeper ones even when a folder is listed first', async () => {
    const tree: Tree = { children: [{ dir: 'sub', children: ['x.txt'] }, 'y.txt'] }
    expect(ids(await collect(run(tree, '*.txt').gen))).toEqual(['root/y.txt', 'root/sub/x.txt'])
  })

  it('includes folders when the pattern has no extension', async () => {
    const tree: Tree = { children: [{ dir: 'report-docs', children: ['report.txt'] }] }
    expect(ids(await collect(run(tree, 'report').gen))).toEqual(['root/report-docs', 'root/report-docs/report.txt'])
  })

  it('silently skips folders that fail with permission or not-found and keeps scanning', async () => {
    const tree: Tree = {
      children: [
        { dir: 'locked', children: ['hidden.txt'], fail: 'permission' },
        { dir: 'gone', children: ['hidden2.txt'], fail: 'not-found' },
        { dir: 'ok', children: ['seen.txt'] },
      ],
    }
    expect(ids(await collect(run(tree, '*.txt').gen))).toEqual(['root/ok/seen.txt'])
  })

  it('does not scan SKIP_DIRS', async () => {
    expect([...SKIP_DIRS].sort()).toEqual(['.git', 'node_modules'])
    const tree: Tree = {
      children: [
        { dir: 'node_modules', children: ['pkg.txt'] },
        { dir: '.git', children: ['cfg.txt'] },
        { dir: 'src', children: ['app.txt'] },
      ],
    }
    const { gen, calls } = run(tree, '*.txt')
    expect(ids(await collect(gen))).toEqual(['root/src/app.txt'])
    expect(calls).toEqual(['root', 'root/src'])
  })

  it('stops without more results once the signal is aborted', async () => {
    const controller = new AbortController()
    const { gen } = run(deep, '*.txt', controller.signal)
    const first = await gen.next()
    expect(first.value?.entry.name).toBe('a.txt')
    controller.abort()
    expect((await gen.next()).done).toBe(true)
  })

  it('yields nothing for an already aborted signal without reading the disk', async () => {
    const controller = new AbortController()
    controller.abort()
    const { gen, calls } = run(deep, '*.txt', controller.signal)
    expect(await collect(gen)).toEqual([])
    expect(calls).toEqual([])
  })

  it('ends quietly without results when the root cannot be read', async () => {
    for (const fail of ['permission', 'not-found', 'unknown'] as const) {
      expect(await collect(run({ children: ['a.txt'], fail }, '*.txt').gen)).toEqual([])
    }
  })

  it('rethrows errors that are not FsError', async () => {
    const adapter = {
      listNames: async () => {
        throw new TypeError('bug')
      },
    } as unknown as FileSystemAdapter
    const gen = scanTree(adapter, { id: 'r', name: 'r', parent: null }, compilePattern('a'), new AbortController().signal)
    await expect(collect(gen)).rejects.toThrow(TypeError)
  })
})

describe('scanTree performance (targets on an in-memory adapter, not guarantees)', () => {
  /** כ-10,000 קבצים ב-5 רמות: 6 תיקיות משנה ו-6 קבצים בכל תיקייה. */
  function build(level: number): Node[] {
    const files: Node[] = Array.from({ length: 6 }, (_, i) => `f${level}-${i}.dat`)
    if (level === 5) return files
    const dirs: Node[] = Array.from({ length: 6 }, (_, i) => ({ dir: `d${level}-${i}`, children: build(level + 1) }))
    return [...files, ...dirs]
  }

  it('reaches the first result (SM-2, ~1s) and a depth-5 file (SM-1, ~5s)', async () => {
    const { gen } = run({ children: build(1) }, 'f1-3.dat')
    const start = performance.now()
    const first = await gen.next()
    const firstMs = performance.now() - start
    expect(first.value?.depth).toBe(1)

    const deepRun = run({ children: build(1) }, 'f5-3.dat')
    const deepStart = performance.now()
    const deepFirst = await deepRun.gen.next()
    const deepMs = performance.now() - deepStart
    expect(deepFirst.value?.depth).toBe(5)

    console.info(`scanTree perf: first=${firstMs.toFixed(1)}ms, depth5=${deepMs.toFixed(1)}ms`)
    expect(firstMs).toBeLessThan(1000)
    expect(deepMs).toBeLessThan(5000)
  })
})

describe('scanTree does not enforce a result cap (AD-8)', () => {
  it('yields every match even beyond 500; the cap belongs to the consumer', async () => {
    const files = Array.from({ length: 650 }, (_, i) => `f${i}.txt`)
    const results = await collect(run({ children: files }, '*.txt').gen)
    expect(results).toHaveLength(650)
  })
})

describe('scanTree scores (3.1)', () => {
  it('computes score through scoreMatch without changing the BFS order', async () => {
    const tree: Tree = { children: [{ dir: 'sub', children: ['abc'] }, 'abc', 'abcd'] }
    const results = await collect(run(tree, 'abc').gen)
    expect(results.map((r) => [r.entry.id, r.depth, r.score])).toEqual([
      ['root/abc', 1, 95],
      ['root/abcd', 1, Math.round((3 / 4) * 100 - 5)],
      ['root/sub/abc', 2, 90],
    ])
  })
})
