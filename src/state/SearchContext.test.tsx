// @vitest-environment jsdom
import { act, cleanup, render, waitFor } from '@testing-library/react'
import { StrictMode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { FileSystemAdapter } from '../lib/fileSystem'
import type { FileSystemEntry, FolderRef } from '../lib/models/entry'
import { ExplorerProvider, useExplorer } from './ExplorerContext'
import { currentLocation } from './explorerReducer'
import { SearchProvider, useSearch } from './SearchContext'

const root: FolderRef = { id: 'root', name: 'Root', parent: null }
const sub: FolderRef = { id: 'root/sub', name: 'sub', parent: root }
const other: FolderRef = { id: 'other', name: 'Other', parent: null }

const file = (parent: FolderRef, name: string): FileSystemEntry => ({
  id: `${parent.id}/${name}`,
  name,
  kind: 'file',
  extension: name.slice(name.lastIndexOf('.') + 1),
})
const subEntry: FileSystemEntry = { id: sub.id, name: 'sub', kind: 'folder', extension: '', folder: sub }

const tree: Record<string, FileSystemEntry[]> = {
  [root.id]: [file(root, 'a.txt'), subEntry],
  [sub.id]: [file(sub, 'b.txt')],
  [other.id]: [],
}

/** adapter בזיכרון; `gate` מאפשר להשהות את הסריקה עד שהבדיקה משחררת אותה. */
function makeAdapter(gate?: { wait: Promise<void> }) {
  const listNames = vi.fn(async (folder: FolderRef) => {
    if (gate) await gate.wait
    return tree[folder.id] ?? []
  })
  const adapter: FileSystemAdapter = {
    isSupported: () => true,
    pickFolder: async () => root,
    listEntries: async (folder) => tree[folder.id] ?? [],
    listSubfolders: async () => [],
    listNames,
    getFile: async () => new File([], 'x'),
  }
  return { adapter, listNames }
}

type Api = { explorer: ReturnType<typeof useExplorer>; search: ReturnType<typeof useSearch> }
let api: Api
function Probe() {
  api = { explorer: useExplorer(), search: useSearch() }
  return null
}

function mount(adapter: FileSystemAdapter, strict = false) {
  const tree = (
    <ExplorerProvider adapter={adapter}>
      <SearchProvider>
        <Probe />
      </SearchProvider>
    </ExplorerProvider>
  )
  render(strict ? <StrictMode>{tree}</StrictMode> : tree)
}
const loc = () => currentLocation(api.explorer.state)
const names = () => api.search.session?.results.map((r) => r.entry.name)

afterEach(cleanup)

describe('SearchProvider', () => {
  it('start from a folder creates a scanning session and a new history entry, then completes', async () => {
    mount(makeAdapter().adapter)
    act(() => api.explorer.actions.goTo({ type: 'folder', folder: root }))
    act(() => api.search.actions.start('*.txt'))

    expect(loc()).toEqual({ type: 'search', root, pattern: '*.txt' })
    expect(api.explorer.state.history).toHaveLength(3)
    expect(api.search.session).toMatchObject({ pattern: '*.txt', root })
    await waitFor(() => expect(api.search.session?.status).toBe('done'))
    expect(names()).toEqual(['a.txt', 'b.txt'])
    expect(api.search.session?.count).toBe(2)
  })

  it('does not start from home, pc or quick', () => {
    mount(makeAdapter().adapter)
    for (const type of ['home', 'pc', 'quick'] as const) {
      act(() => api.explorer.actions.goTo({ type }))
      act(() => api.search.actions.start('a'))
      expect(api.search.session).toBeNull()
      expect(loc().type).toBe(type)
    }
  })

  it('ignores an empty pattern', () => {
    mount(makeAdapter().adapter)
    act(() => api.explorer.actions.goTo({ type: 'folder', folder: root }))
    act(() => api.search.actions.start('   '))
    expect(api.search.session).toBeNull()
  })

  it('start while on search replaces the entry, cuts forward and aborts the previous scan', async () => {
    mount(makeAdapter().adapter)
    act(() => api.explorer.actions.goTo({ type: 'folder', folder: root }))
    act(() => api.search.actions.start('a'))
    const firstRun = api.search.session!.runId
    const length = api.explorer.state.history.length
    await waitFor(() => expect(api.search.session?.status).toBe('done'))

    act(() => api.search.actions.start('b'))
    expect(api.explorer.state.history).toHaveLength(length)
    expect(loc()).toEqual({ type: 'search', root, pattern: 'b' })
    expect(api.search.session!.runId).toBeGreaterThan(firstRun)
    await waitFor(() => expect(names()).toEqual(['sub', 'b.txt']))
  })

  it('stop keeps the found results, sets stopped and drops results arriving later', async () => {
    let release!: () => void
    const gate = { wait: new Promise<void>((resolve) => (release = resolve)) }
    mount(makeAdapter(gate).adapter)
    act(() => api.explorer.actions.goTo({ type: 'folder', folder: root }))
    act(() => api.search.actions.start('txt'))
    act(() => api.search.actions.stop())
    expect(api.search.session?.status).toBe('stopped')
    await act(async () => {
      release()
      await gate.wait
    })
    expect(api.search.session?.status).toBe('stopped')
    expect(api.search.session?.count).toBe(0)
  })

  it("goTo with origin 'user' clears the session and aborts; 'result' does not", async () => {
    mount(makeAdapter().adapter)
    act(() => api.explorer.actions.goTo({ type: 'folder', folder: root }))
    act(() => api.search.actions.start('txt'))
    await waitFor(() => expect(api.search.session?.status).toBe('done'))

    act(() => api.explorer.actions.goTo({ type: 'folder', folder: sub }, { origin: 'result' }))
    expect(api.search.session).not.toBeNull()

    act(() => api.explorer.actions.openFolder(other))
    expect(api.search.session).toBeNull()
  })

  it('a user navigation during a scan aborts it and late results never reach a new session', async () => {
    let release!: () => void
    const gate = { wait: new Promise<void>((resolve) => (release = resolve)) }
    mount(makeAdapter(gate).adapter)
    act(() => api.explorer.actions.goTo({ type: 'folder', folder: root }))
    act(() => api.search.actions.start('txt'))
    act(() => api.explorer.actions.openFolder(other))
    expect(api.search.session).toBeNull()
    await act(async () => {
      release()
      await gate.wait
    })
    expect(api.search.session).toBeNull()
    expect(loc()).toEqual({ type: 'folder', folder: other })
  })

  it('back and forward do not clear the session', async () => {
    mount(makeAdapter().adapter)
    act(() => api.explorer.actions.goTo({ type: 'folder', folder: root }))
    act(() => api.search.actions.start('txt'))
    await waitFor(() => expect(api.search.session?.status).toBe('done'))

    act(() => api.explorer.actions.back())
    expect(loc()).toEqual({ type: 'folder', folder: root })
    expect(api.search.session?.count).toBe(2)
    act(() => api.explorer.actions.forward())
    expect(loc().type).toBe('search')
    expect(api.search.session?.count).toBe(2)
  })

  it('runs a single scan under StrictMode double effects', async () => {
    const { adapter, listNames } = makeAdapter()
    mount(adapter, true)
    act(() => api.explorer.actions.goTo({ type: 'folder', folder: root }))
    listNames.mockClear()
    act(() => api.search.actions.start('txt'))
    await waitFor(() => expect(api.search.session?.status).toBe('done'))
    expect(listNames.mock.calls.filter(([folder]) => folder.id === root.id)).toHaveLength(1)
    expect(names()).toEqual(['a.txt', 'b.txt'])
  })

  it('does not write search state into the explorer state', async () => {
    mount(makeAdapter().adapter)
    act(() => api.explorer.actions.goTo({ type: 'folder', folder: root }))
    act(() => api.search.actions.start('txt'))
    await waitFor(() => expect(api.search.session?.status).toBe('done'))
    expect(api.explorer.state).not.toHaveProperty('results')
    expect(api.explorer.state).not.toHaveProperty('session')
  })
})


describe('SearchProvider pause and resume', () => {
  /** root: a.txt + sub; sub: b.txt. הקריאה לתיקיית sub מוחזקת עד שהבדיקה משחררת אותה. */
  function holdSub() {
    let release!: () => void
    const held = new Promise<void>((resolve) => (release = resolve))
    const { adapter, listNames } = makeAdapter()
    const original = adapter.listNames
    adapter.listNames = async (folder) => {
      if (folder.id === sub.id) await held
      return original(folder)
    }
    return { adapter, listNames, release }
  }

  it('pauses without calling next(), keeps an in-flight result, and resumes without rescanning', async () => {
    const { adapter, listNames, release } = holdSub()
    mount(adapter)
    act(() => api.explorer.actions.goTo({ type: 'folder', folder: root }))
    act(() => api.search.actions.start('txt'))
    await waitFor(() => expect(names()).toEqual(['a.txt']))

    act(() => api.search.actions.pause())
    expect(api.search.session?.status).toBe('paused')
    // התוצאות מתיקיית sub היו בדרך (next() ממתין לתיקייה המוחזקת) ונשמרות גם בהשהיה
    await act(async () => release())
    await waitFor(() => expect(names()).toEqual(['a.txt', 'b.txt']))
    expect(api.search.session?.status).toBe('paused')

    act(() => api.search.actions.resume())
    await waitFor(() => expect(api.search.session?.status).toBe('done'))
    expect(names()).toEqual(['a.txt', 'b.txt'])
    expect(listNames.mock.calls.filter(([f]) => f.id === root.id)).toHaveLength(1)
  })

  it('stops from paused and then cannot resume', async () => {
    const { adapter } = holdSub()
    mount(adapter)
    act(() => api.explorer.actions.goTo({ type: 'folder', folder: root }))
    act(() => api.search.actions.start('txt'))
    await waitFor(() => expect(names()).toEqual(['a.txt']))
    act(() => api.search.actions.pause())
    act(() => api.search.actions.stop())
    expect(api.search.session?.status).toBe('stopped')
    act(() => api.search.actions.resume())
    expect(api.search.session?.status).toBe('stopped')
    expect(names()).toEqual(['a.txt'])
  })

  it('back from the results pauses a running scan and keeps the session; forward and resume finish it', async () => {
    const { adapter, release } = holdSub()
    mount(adapter)
    act(() => api.explorer.actions.goTo({ type: 'folder', folder: root }))
    act(() => api.search.actions.start('txt'))
    await waitFor(() => expect(names()).toEqual(['a.txt']))

    act(() => api.explorer.actions.back())
    expect(loc().type).toBe('folder')
    expect(api.search.session?.status).toBe('paused')
    expect(names()).toEqual(['a.txt'])

    act(() => api.explorer.actions.forward())
    expect(loc().type).toBe('search')
    await act(async () => release())
    act(() => api.search.actions.resume())
    await waitFor(() => expect(api.search.session?.status).toBe('done'))
    expect(names()).toEqual(['a.txt', 'b.txt'])
  })

  it('pause is ignored unless scanning', async () => {
    mount(makeAdapter().adapter)
    act(() => api.explorer.actions.goTo({ type: 'folder', folder: root }))
    act(() => api.search.actions.start('txt'))
    await waitFor(() => expect(api.search.session?.status).toBe('done'))
    act(() => api.search.actions.pause())
    expect(api.search.session?.status).toBe('done')
  })
})
