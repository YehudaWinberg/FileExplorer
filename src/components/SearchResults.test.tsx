// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { FileSystemAdapter } from '../lib/fileSystem'
import type { FileSystemEntry, FolderRef } from '../lib/models/entry'
import { ExplorerProvider, useExplorer } from '../state/ExplorerContext'
import { SearchProvider, useSearch } from '../state/SearchContext'
import { DetailsPane } from './DetailsPane'
import { SearchResults } from './SearchResults'
import { StatusBar } from './StatusBar'

const root: FolderRef = { id: 'root', name: 'Root', parent: null }
const a: FolderRef = { id: 'root/a', name: 'a', parent: root }
const b: FolderRef = { id: 'root/a/b', name: 'b', parent: a }
const c: FolderRef = { id: 'root/a/b/c', name: 'c', parent: b }
const d: FolderRef = { id: 'root/a/b/c/d', name: 'd', parent: c }

const file = (parent: FolderRef, name: string): FileSystemEntry => ({
  id: `${parent.id}/${name}`,
  name,
  kind: 'file',
  extension: name.slice(name.lastIndexOf('.') + 1),
})
const dir = (ref: FolderRef): FileSystemEntry => ({ id: ref.id, name: ref.name, kind: 'folder', extension: '', folder: ref })

const tree: Record<string, FileSystemEntry[]> = {
  [root.id]: [file(root, 'top.txt'), file(root, 'skip.bin'), dir(a)],
  [a.id]: [dir(b)],
  [b.id]: [dir(c)],
  [c.id]: [dir(d)],
  [d.id]: [file(d, 'deep.txt')],
}

function makeAdapter() {
  const getFile = vi.fn(async (entry: FileSystemEntry) => new File(['x'.repeat(2048)], entry.name, { lastModified: Date.UTC(2026, 0, 15) }))
  const adapter: FileSystemAdapter = {
    isSupported: () => true,
    pickFolder: async () => root,
    listEntries: async (folder) => tree[folder.id] ?? [],
    listSubfolders: async () => [],
    listNames: async (folder) => tree[folder.id] ?? [],
    getFile,
  }
  return { adapter, getFile }
}

let api: { explorer: ReturnType<typeof useExplorer>; search: ReturnType<typeof useSearch> }
function Probe() {
  api = { explorer: useExplorer(), search: useSearch() }
  return null
}

function mount(adapter: FileSystemAdapter) {
  render(
    <ExplorerProvider adapter={adapter}>
      <SearchProvider>
        <Probe />
        <SearchResults />
        <DetailsPane />
        <StatusBar />
      </SearchProvider>
    </ExplorerProvider>,
  )
  act(() => api.explorer.actions.goTo({ type: 'folder', folder: root }))
}

const search = (pattern: string) => act(() => api.search.actions.start(pattern))
const rows = () => within(screen.getByRole('table')).getAllByRole('row').slice(1)
const rowNames = () => rows().map((r) => within(r).getAllByRole('cell')[0].querySelector('.ellipsis')?.textContent)

afterEach(cleanup)

describe('SearchResults', () => {
  it('shows results in arrival order (shallow first) with name, path and size columns', async () => {
    const { adapter } = makeAdapter()
    mount(adapter)
    search('*.txt')
    await waitFor(() => expect(rowNames()).toEqual(['top.txt', 'deep.txt']))
    expect(screen.getAllByRole('columnheader').map((h) => h.textContent)).toEqual(['שם', 'נתיב', 'גודל'])

    const [top, deep] = rows()
    expect(within(top).getAllByRole('cell')[1].textContent).toBe('Root')
    // עומק 5: שורש + … + שתי התיקיות האחרונות, והנתיב המלא ב-tooltip
    const deepPath = within(deep).getAllByRole('cell')[1]
    expect(deepPath.textContent).toBe('Root/…/c/d')
    expect(deepPath.getAttribute('title')).toBe('Root/a/b/c/d')
  })

  it('loads size and date only for displayed results', async () => {
    const { adapter, getFile } = makeAdapter()
    mount(adapter)
    search('*.txt')
    await waitFor(() => expect(within(rows()[0]).getAllByRole('cell')[2].textContent).toBe('2 KB'))
    expect(within(rows()[0]).getAllByRole('cell')[0].textContent).toContain('שונה ב-')
    expect(getFile.mock.calls.map(([entry]) => entry.name).sort()).toEqual(['deep.txt', 'top.txt'])
  })

  it('shows the empty state when a finished scan found nothing', async () => {
    const { adapter } = makeAdapter()
    mount(adapter)
    search('zzz')
    expect(await screen.findByText('לא נמצאו תוצאות')).toBeTruthy()
    expect(screen.getByText('אין קובץ שמתאים ל-"zzz" בתיקיית Root ובתיקיות שבתוכה.')).toBeTruthy()
    expect(screen.getByText('נסו שם קצר יותר, למשל כהן*')).toBeTruthy()
  })

  it('reports the count in the status bar and fills the details pane from the selected result', async () => {
    const { adapter } = makeAdapter()
    mount(adapter)
    search('*.txt')
    await waitFor(() => expect(rows()).toHaveLength(2))
    expect(screen.getByText('2 תוצאות')).toBeTruthy()
    expect(screen.getByText('בחרו תוצאה כדי לראות תצוגה מקדימה')).toBeTruthy()

    fireEvent.click(rows()[1])
    const pane = await screen.findByRole('complementary', { name: 'פרטי קובץ' })
    expect(within(pane).getAllByText('deep.txt').length).toBeGreaterThan(0)
    expect(within(pane).getByText('a/b/c/d/deep.txt')).toBeTruthy()
    expect(rows()[1].getAttribute('aria-selected')).toBe('true')
    expect(screen.getByText('1 פריטים נבחרו')).toBeTruthy()
  })
})
