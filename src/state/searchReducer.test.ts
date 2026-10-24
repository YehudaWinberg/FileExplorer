import { describe, expect, it } from 'vitest'
import type { FileSystemEntry, FolderRef } from '../lib/models/entry'
import type { SearchResult } from '../lib/scanTree'
import { searchReducer, type SearchAction, type SearchState } from './searchReducer'

const root: FolderRef = { id: 'root', name: 'Root', parent: null }
const result = (name: string, depth = 1): SearchResult => {
  const entry: FileSystemEntry = { id: `root/${name}`, name, kind: 'file', extension: 'txt' }
  return { entry, parent: root, depth, score: 0 }
}
const run = (...actions: SearchAction[]): SearchState => actions.reduce(searchReducer, null as SearchState)
const start = (runId: number, pattern = 'a'): SearchAction => ({ type: 'start', runId, root, pattern })

describe('searchReducer', () => {
  it('starts a scanning session with the SearchSession shape', () => {
    expect(run(start(1, '*.txt'))).toEqual({
      runId: 1,
      root,
      pattern: '*.txt',
      status: 'scanning',
      results: [],
      count: 0,
      sortedByScore: false,
    })
  })

  it('appends results in arrival order (no sorting) and counts them', () => {
    const state = run(
      start(1),
      { type: 'result', runId: 1, result: result('b.txt', 2) },
      { type: 'result', runId: 1, result: result('a.txt', 1) },
    )
    expect(state?.results.map((r) => r.entry.name)).toEqual(['b.txt', 'a.txt'])
    expect(state?.count).toBe(2)
  })

  it('finishes as done when the tree ends', () => {
    expect(run(start(1), { type: 'finished', runId: 1 })?.status).toBe('done')
  })

  it('ignores actions with a stale runId (AD-9)', () => {
    const base = run(start(2))
    for (const action of [
      { type: 'result', runId: 1, result: result('old.txt') },
      { type: 'finished', runId: 1 },
      { type: 'stop', runId: 1 },
    ] as SearchAction[]) {
      expect(searchReducer(base, action)).toBe(base)
    }
  })

  it('keeps found results on stop and drops results that arrive after it', () => {
    const state = run(
      start(1),
      { type: 'result', runId: 1, result: result('a.txt') },
      { type: 'stop', runId: 1 },
      { type: 'result', runId: 1, result: result('late.txt') },
      { type: 'finished', runId: 1 },
    )
    expect(state?.status).toBe('stopped')
    expect(state?.results.map((r) => r.entry.name)).toEqual(['a.txt'])
    expect(state?.count).toBe(1)
  })

  it('replaces the session on a new start and clears to null', () => {
    const state = run(start(1), { type: 'result', runId: 1, result: result('a.txt') }, start(2, 'b'))
    expect(state).toMatchObject({ runId: 2, pattern: 'b', results: [], count: 0 })
    expect(searchReducer(state, { type: 'clear' })).toBeNull()
  })
})
