import { describe, expect, it } from 'vitest'
import type { FolderRef, Location } from '../lib/models/entry'
import { currentLocation, explorerReducer, initialState, type ExplorerAction, type ExplorerState } from './explorerReducer'

const root: FolderRef = { id: 'root1', name: 'Projects', parent: null }
const child: FolderRef = { id: 'root1/2026', name: '2026', parent: root }
const at = (folder: FolderRef): Location => ({ type: 'folder', folder })

function run(...actions: ExplorerAction[]): ExplorerState {
  return actions.reduce(explorerReducer, initialState)
}

describe('navigate replace and search locations', () => {
  const search = (pattern: string): Location => ({ type: 'search', root, pattern })

  it('replace swaps the current entry and cuts forward history', () => {
    let state = run({ type: 'navigate', location: at(root) }, { type: 'navigate', location: at(child) })
    state = explorerReducer(state, { type: 'back' })
    state = explorerReducer(state, { type: 'navigate', location: search('a'), replace: true })
    expect(state.history).toEqual([{ type: 'home' }, search('a')])
    expect(currentLocation(state)).toEqual(search('a'))
    expect(state.status).toBe('idle')
  })

  it('without replace a search location adds an entry', () => {
    const state = run({ type: 'navigate', location: at(root) }, { type: 'navigate', location: search('a') })
    expect(state.history).toHaveLength(3)
  })
})

describe('navigate with select (4.2)', () => {
  it('selects the given item in the new location and anchors on it', () => {
    const state = run({ type: 'navigate', location: at(root) }, { type: 'navigate', location: at(child), select: 'root1/2026/a.txt' })
    expect(state.selection).toEqual(['root1/2026/a.txt'])
    expect(state.anchor).toBe('root1/2026/a.txt')
  })

  it('without select the selection is cleared as before', () => {
    const state = run({ type: 'navigate', location: at(root), select: 'x' }, { type: 'navigate', location: at(child) })
    expect(state.selection).toEqual([])
    expect(state.anchor).toBeNull()
  })
})

describe('navigation', () => {
  it('starts at home with nothing to go back/forward to', () => {
    const state = run({ type: 'back' }, { type: 'forward' })
    expect(currentLocation(state)).toEqual({ type: 'home' })
  })

  it('navigates, goes back and forward, and truncates forward history on new navigation', () => {
    let state = run({ type: 'navigate', location: at(root) }, { type: 'navigate', location: at(child) })
    expect(currentLocation(state)).toEqual(at(child))
    expect(state.status).toBe('loading')

    state = explorerReducer(state, { type: 'back' })
    expect(currentLocation(state)).toEqual(at(root))
    state = explorerReducer(state, { type: 'forward' })
    expect(currentLocation(state)).toEqual(at(child))

    state = explorerReducer(explorerReducer(state, { type: 'back' }), { type: 'navigate', location: { type: 'quick' } })
    expect(state.history).toHaveLength(3)
    expect(explorerReducer(state, { type: 'forward' })).toBe(state)
  })

  it('ignores navigation to the current location', () => {
    const state = run({ type: 'navigate', location: at(root) })
    expect(explorerReducer(state, { type: 'navigate', location: at(root) })).toBe(state)
  })
})

describe('type filter', () => {
  it('toggles types on and off and clears the filter', () => {
    let state = run({ type: 'toggleTypeFilter', label: 'מסמך PDF' }, { type: 'toggleTypeFilter', label: 'תיקיית קבצים' })
    expect(state.typeFilter).toEqual(['מסמך PDF', 'תיקיית קבצים'])
    state = explorerReducer(state, { type: 'toggleTypeFilter', label: 'מסמך PDF' })
    expect(state.typeFilter).toEqual(['תיקיית קבצים'])
    state = explorerReducer(state, { type: 'clearTypeFilter' })
    expect(state.typeFilter).toEqual([])
  })

  it('resets the filter when a folder is loaded by navigation', () => {
    const state = run(
      { type: 'toggleTypeFilter', label: 'מסמך PDF' },
      { type: 'navigate', location: at(root) },
    )
    expect(state.typeFilter).toEqual([])
    expect(explorerReducer({ ...state, typeFilter: ['x'] }, { type: 'back' }).typeFilter).toEqual([])
  })
})

describe('selection', () => {
  const ids = ['a', 'b', 'c', 'd']
  const click = (state: ExplorerState, id: string, ctrl = false, shift = false) =>
    explorerReducer(state, { type: 'click', id, ctrl, shift, orderedIds: ids })

  it('single, ctrl and shift selection', () => {
    let state = click(initialState, 'b')
    expect(state.selection).toEqual(['b'])
    state = click(state, 'd', true)
    expect(state.selection).toEqual(['b', 'd'])
    state = click(state, 'b', true)
    expect(state.selection).toEqual(['d'])
    state = click(click(initialState, 'a'), 'c', false, true)
    expect(state.selection).toEqual(['a', 'b', 'c'])
  })

  it('clears selection on navigation', () => {
    const state = explorerReducer(click(initialState, 'a'), { type: 'navigate', location: at(root) })
    expect(state.selection).toEqual([])
  })
})

describe('sorting and tree', () => {
  it('toggles direction on the same key and resets on a new key', () => {
    let state = run({ type: 'sort', key: 'name' })
    expect(state.sort).toEqual({ key: 'name', direction: 'desc' })
    state = explorerReducer(state, { type: 'sort', key: 'size' })
    expect(state.sort).toEqual({ key: 'size', direction: 'asc' })
  })

  it('caches loaded children and toggles expansion', () => {
    const state = run({ type: 'toggleExpand', id: root.id }, { type: 'childrenLoaded', id: root.id, children: [child] })
    expect(state.expanded[root.id]).toBe(true)
    expect(state.children[root.id]).toEqual([child])
  })

  it('refresh drops the cached children of the current folder', () => {
    const state = run(
      { type: 'navigate', location: at(root) },
      { type: 'childrenLoaded', id: root.id, children: [child] },
      { type: 'refresh' },
    )
    expect(state.children[root.id]).toBeUndefined()
    expect(state.refreshCount).toBe(1)
  })
  it('records a tree error for a folder that cannot be read and keeps it expandable state', () => {
    const state = run(
      { type: 'toggleExpand', id: root.id },
      { type: 'childrenFailed', id: root.id, message: 'אין הרשאה' },
    )
    expect(state.children[root.id]).toEqual([])
    expect(state.treeErrors[root.id]).toBe('אין הרשאה')
    const recovered = explorerReducer(state, { type: 'childrenLoaded', id: root.id, children: [child] })
    expect(recovered.treeErrors[root.id]).toBeUndefined()
  })

  it('expands ancestors without collapsing other nodes, and toggles closed again', () => {
    let state = run({ type: 'toggleExpand', id: 'other' }, { type: 'expand', ids: [root.id] })
    expect(state.expanded).toEqual({ other: true, [root.id]: true })
    state = explorerReducer(state, { type: 'toggleExpand', id: root.id })
    expect(state.expanded[root.id]).toBe(false)
  })
})

describe('picked folders', () => {
  it('adds a picked folder once, as a root, and remembers it only in memory', () => {
    const state = run(
      { type: 'picked', folder: root },
      { type: 'picked', folder: root, special: 'documents' },
    )
    expect(state.roots).toEqual([root])
    expect(state.specials.documents).toBe(root)
  })

  it('shows loaded entries and load errors for the current folder', () => {
    const loaded = run({ type: 'navigate', location: at(root) }, { type: 'loaded', entries: [] })
    expect(loaded.status).toBe('idle')
    const failed = explorerReducer(loaded, { type: 'loadFailed', message: 'שגיאה' })
    expect(failed).toMatchObject({ status: 'error', error: 'שגיאה' })
  })
})
