// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { FileSystemAdapter } from '../lib/fileSystem'
import type { FileSystemEntry, FolderRef } from '../lib/models/entry'
import { ExplorerProvider, useExplorer } from '../state/ExplorerContext'
import { SearchProvider } from '../state/SearchContext'
import { FileList } from './FileList'
import { SearchResults } from './SearchResults'
import { StatusBar } from './StatusBar'
import { Toolbar } from './Toolbar'

const root: FolderRef = { id: 'root', name: 'Root', parent: null }
const reports: FolderRef = { id: 'root/Reports', name: 'Reports', parent: root }

const file = (parent: FolderRef, name: string): FileSystemEntry => ({
  id: `${parent.id}/${name}`,
  name,
  kind: 'file',
  size: 1024,
  modified: Date.UTC(2026, 0, 15),
  extension: name.slice(name.lastIndexOf('.') + 1).toLowerCase(),
})
const folder = (ref: FolderRef): FileSystemEntry => ({ id: ref.id, name: ref.name, kind: 'folder', extension: '', folder: ref })

const listings: Record<string, FileSystemEntry[]> = {
  root: [file(root, 'Report.pdf'), file(root, 'photo.jpg'), file(root, 'notes.txt'), folder(reports)],
  [reports.id]: [file(reports, 'q1.txt'), file(reports, 'report-final.pdf')],
}

/** כשה-gate פעיל, קריאות listNames ממתינות עד ש-`release` נקרא (סריקה "בדרך"). */
let gate: { wait: Promise<void>; release: () => void } | null
let pickFolder: ReturnType<typeof vi.fn<FileSystemAdapter['pickFolder']>>

function makeAdapter(): FileSystemAdapter {
  pickFolder = vi.fn<FileSystemAdapter['pickFolder']>(async () => root)
  return {
    isSupported: () => true,
    pickFolder,
    listEntries: async (f) => listings[f.id] ?? [],
    listSubfolders: async () => [],
    listNames: async (f) => {
      if (gate) await gate.wait
      return listings[f.id] ?? []
    },
    getFile: async (entry) => new File(['x'], entry.name),
  }
}

function Harness() {
  const { location, actions } = useExplorer()
  return (
    <>
      <Toolbar />
      <button type="button" onClick={() => actions.openFolder(reports)}>open-reports</button>
      <button type="button" onClick={() => actions.navigate({ type: 'pc' })}>go-pc</button>
      {location.type === 'folder' && <FileList />}
      {location.type === 'search' && <SearchResults />}
      <StatusBar />
    </>
  )
}

const searchBox = () => screen.getByRole('searchbox') as HTMLInputElement
const type = (text: string) => act(() => void fireEvent.change(searchBox(), { target: { value: text } }))
const advance = (ms: number) => act(async () => void (await vi.advanceTimersByTimeAsync(ms)))
const listNames = () => within(screen.getByRole('table')).queryAllByRole('row').slice(1)
/** מרוקן הבטחות ממתינות (הטיימרים מזויפים, ולכן אין waitFor/findBy). */
const flush = () => act(async () => void (await vi.advanceTimersByTimeAsync(0)))
const address = () => screen.getByRole('navigation', { name: 'נתיב נוכחי' })

async function openRoot() {
  render(
    <ExplorerProvider adapter={makeAdapter()}>
      <SearchProvider>
        <Harness />
      </SearchProvider>
    </ExplorerProvider>,
  )
  await act(async () => fireEvent.click(screen.getByRole('button', { name: 'בחירת תיקייה' })))
  await flush()
  expect(screen.getByText('Report.pdf')).toBeTruthy()
}

beforeEach(() => {
  gate = null
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
})

afterEach(() => {
  vi.useRealTimers()
  cleanup()
})

describe('search box in the address bar', () => {
  it('is disabled at home and enabled inside a folder', async () => {
    render(
      <ExplorerProvider adapter={makeAdapter()}>
        <SearchProvider>
          <Harness />
        </SearchProvider>
      </ExplorerProvider>,
    )
    expect(searchBox().disabled).toBe(true)
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'בחירת תיקייה' })))
    await flush()
    expect(searchBox().disabled).toBe(false)
    await act(async () => fireEvent.click(screen.getByText('go-pc')))
    expect(searchBox().disabled).toBe(true)
  })

  it('starts the search only 300ms after the last keystroke and does not filter the folder meanwhile', async () => {
    await openRoot()
    await type('re')
    await advance(200)
    await type('rep')
    await advance(200)
    // עברו 400ms מההקלדה הראשונה אך רק 200ms מהאחרונה: עדיין בתיקייה, בלי סינון.
    expect(screen.queryByRole('table', { name: 'תוצאות החיפוש' })).toBeNull()
    expect(listNames().map((r) => r.textContent).join()).toContain('photo.jpg')

    await advance(100)
    await flush()
    expect(screen.getByRole('table', { name: 'תוצאות החיפוש' })).toBeTruthy()
    expect(screen.getByText('3 תוצאות')).toBeTruthy()
  })

  it('keeps what the user typed after the search started, while typing continues', async () => {
    await openRoot()
    await type('rep')
    await advance(300)
    await type('repo')
    await flush()
    expect(searchBox().value).toBe('repo')
    await advance(300)
    await flush()
    expect(searchBox().value).toBe('repo')
  })

  it('a user navigation cancels a pending search', async () => {
    await openRoot()
    await type('rep')
    await advance(100)
    await act(async () => fireEvent.click(screen.getByText('open-reports')))
    await advance(500)
    expect(screen.queryByRole('table', { name: 'תוצאות החיפוש' })).toBeNull()
    expect(searchBox().value).toBe('')
  })

  it('expands on focus, shortens the address to "… › folder", and restores on blur', async () => {
    await openRoot()
    expect(within(address()).getByText('Root')).toBeTruthy()
    const box = searchBox().closest('.search-box')!
    expect(box.classList.contains('search-box--focus')).toBe(false)

    act(() => void fireEvent.focus(searchBox()))
    expect(box.classList.contains('search-box--focus')).toBe(true)
    expect(within(address()).getByText('…')).toBeTruthy()
    expect(within(address()).getByText('Root')).toBeTruthy()

    act(() => void fireEvent.blur(searchBox()))
    expect(box.classList.contains('search-box--focus')).toBe(false)
    expect(within(address()).queryByText('…')).toBeNull()
  })

  it('shows no controls at rest; while scanning it shows the count and a stop button', async () => {
    gate = (() => {
      let release!: () => void
      return { wait: new Promise<void>((resolve) => (release = resolve)), release }
    })()
    await openRoot()
    expect(screen.queryByRole('button', { name: 'עצירה' })).toBeNull()

    await type('rep')
    await advance(300)
    expect(screen.getByText('סורק… נמצאו 0')).toBeTruthy()
    const stop = screen.getByRole('button', { name: 'עצירה' })
    expect(stop.getAttribute('title')).toBe('עצירה')
    // הכרזה מנומסת על מעבר המצב בלבד, בלי מספר תוצאות
    expect(screen.getByRole('status').textContent).toBe('סורק')

    await act(async () => fireEvent.click(stop))
    expect(screen.queryByRole('button', { name: 'עצירה' })).toBeNull()
    expect(screen.queryByText(/סורק…/)).toBeNull()
    expect(screen.getByRole('status').textContent).toBe('הסריקה נעצרה, נמצאו 0 תוצאות')
  })

  it('finishes the scan, hides the controls and announces the result count once', async () => {
    await openRoot()
    await type('report')
    await advance(300)
    await flush()
    expect(screen.queryByRole('button', { name: 'עצירה' })).toBeNull()
    expect(screen.getByRole('status').textContent).toBe('הסריקה הסתיימה, נמצאו 3 תוצאות')
  })
})

describe('folder picker icon (FR22 regression)', () => {
  it('opens the picker and navigates to the chosen folder like the old button', async () => {
    await openRoot()
    expect(pickFolder).toHaveBeenCalledTimes(1)
    expect(within(address()).getByText('Root')).toBeTruthy()
    const button = screen.getByRole('button', { name: 'בחירת תיקייה' })
    expect(button.getAttribute('title')).toBe('בחירת תיקייה')
  })
})
