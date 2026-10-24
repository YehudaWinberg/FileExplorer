// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { FileSystemAdapter } from '../lib/fileSystem'
import type { FileSystemEntry, FolderRef } from '../lib/models/entry'
import { ExplorerProvider, useExplorer } from '../state/ExplorerContext'
import { SearchProvider } from '../state/SearchContext'
import { FileList } from './FileList'
import { progressPercent } from './SearchBox'
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
let listNamesCalls: string[]
const rootScans = () => listNamesCalls.filter((id) => id === 'root').length
let pickFolder: ReturnType<typeof vi.fn<FileSystemAdapter['pickFolder']>>

function makeAdapter(): FileSystemAdapter {
  pickFolder = vi.fn<FileSystemAdapter['pickFolder']>(async () => root)
  return {
    isSupported: () => true,
    pickFolder,
    listEntries: async (f) => listings[f.id] ?? [],
    listSubfolders: async () => [],
    listNames: async (f) => {
      listNamesCalls.push(f.id)
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
  listNamesCalls = []
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

const resultNames = () =>
  within(screen.getByRole('table', { name: 'תוצאות החיפוש' }))
    .getAllByRole('row')
    .slice(1)
    .map((r) => r.querySelector('.ellipsis')?.textContent)
const inResults = () => screen.queryByRole('table', { name: 'תוצאות החיפוש' })

async function searchFor(text: string) {
  await type(text)
  await advance(300)
  await flush()
}

describe('leaving the results (FR21)', () => {
  it('clearing the box returns to the root folder of the search and clears the session', async () => {
    await openRoot()
    await act(async () => fireEvent.click(screen.getByText('open-reports')))
    await searchFor('q1')
    expect(resultNames()).toEqual(['q1.txt'])

    await type('')
    await flush()
    expect(inResults()).toBeNull()
    expect(within(address()).getByText('Reports')).toBeTruthy()
    expect(screen.getByRole('table', { name: 'תוכן התיקייה' })).toBeTruthy()
    expect(screen.queryByText(/תוצאות$/)).toBeNull()
  })

  it('up from results goes to the search root; refresh re-runs the search', async () => {
    await openRoot()
    await searchFor('report')
    expect(resultNames()).toHaveLength(3)

    const scansBefore = rootScans()
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'רענון' })))
    await flush()
    expect(resultNames()).toHaveLength(3)
    expect(rootScans()).toBe(scansBefore + 1)

    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'תיקיית אב' })))
    expect(inResults()).toBeNull()
    expect(screen.getByRole('table', { name: 'תוכן התיקייה' })).toBeTruthy()
  })

  it.each([
    ['clicking a breadcrumb', () => fireEvent.click(within(address()).getByText('Root'))],
    ['picking a folder', () => fireEvent.click(screen.getByRole('button', { name: 'בחירת תיקייה' }))],
    ['going to another place', () => fireEvent.click(screen.getByText('go-pc'))],
  ])('%s during an active scan aborts it and leaves no stale results', async (_name, navigate) => {
    let release!: () => void
    await openRoot()
    gate = { wait: new Promise<void>((resolve) => (release = resolve)), release }
    await searchFor('report')
    expect(screen.getByRole('button', { name: 'עצירה' })).toBeTruthy()

    await act(async () => void navigate())
    await act(async () => {
      release()
      await gate!.wait
    })
    await flush()
    expect(screen.queryByRole('button', { name: 'עצירה' })).toBeNull()
    expect(inResults()).toBeNull()
    expect(screen.queryByText(/נמצאו/)).toBeNull()
  })

  it('a plain name the old filter would find also appears in the search results (FR22)', async () => {
    await openRoot()
    await searchFor('photo')
    expect(resultNames()).toEqual(['photo.jpg'])
    await searchFor('notes.txt')
    expect(resultNames()).toEqual(['notes.txt'])
  })
})


describe('pause and resume controls (2.1)', () => {
  function holdAll() {
    let release!: () => void
    gate = { wait: new Promise<void>((resolve) => (release = resolve)), release }
  }

  it('shows pause next to stop while scanning; paused shows text, a resume button and stop', async () => {
    holdAll()
    await openRoot()
    await searchFor('rep')
    expect(screen.getByRole('button', { name: 'השהיה' }).getAttribute('title')).toBe('השהיה')
    expect(screen.getByRole('button', { name: 'עצירה' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'המשך' })).toBeNull()

    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'השהיה' })))
    expect(screen.getByText('מושהה — נמצאו 0')).toBeTruthy()
    expect(searchBox().closest('.search-box')!.classList.contains('search-box--paused')).toBe(true)
    expect(screen.getByRole('button', { name: 'המשך' }).getAttribute('title')).toBe('המשך')
    expect(screen.getByRole('button', { name: 'עצירה' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'השהיה' })).toBeNull()
    expect(screen.getByRole('status').textContent).toBe('הסריקה מושהית')

    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'המשך' })))
    expect(screen.getByText('סורק… נמצאו 0')).toBeTruthy()
    expect(searchBox().closest('.search-box')!.classList.contains('search-box--paused')).toBe(false)
  })

  it('stopping from paused ends the scan and hides every control', async () => {
    holdAll()
    await openRoot()
    await searchFor('rep')
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'השהיה' })))
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'עצירה' })))
    expect(screen.queryByRole('button', { name: 'המשך' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'עצירה' })).toBeNull()
    expect(screen.queryByText(/מושהה/)).toBeNull()
  })
})


describe('scan progress bar (2.2)', () => {
  const fill = () => document.querySelector<HTMLElement>('.scan-progress__fill')
  const holdAll = () => {
    let release!: () => void
    gate = { wait: new Promise<void>((resolve) => (release = resolve)), release }
  }

  it('computes the width as count / 500, capped at 100%, and 100% when done', () => {
    expect(progressPercent('scanning', 0)).toBe(0)
    expect(progressPercent('scanning', 250)).toBe(50)
    expect(progressPercent('paused', 125)).toBe(25)
    expect(progressPercent('stopped', 100)).toBe(20)
    expect(progressPercent('scanning', 900)).toBe(100)
    expect(progressPercent('done', 3)).toBe(100)
  })

  it('has no bar at rest and is decorative only (aria-hidden)', async () => {
    holdAll()
    await openRoot()
    expect(fill()).toBeNull()
    await searchFor('rep')
    expect(fill()).not.toBeNull()
    expect(fill()!.closest('.scan-progress')!.getAttribute('aria-hidden')).toBe('true')
  })

  it('is blue while scanning, frozen orange when paused and blue again on resume', async () => {
    holdAll()
    await openRoot()
    await searchFor('rep')
    expect(fill()!.style.width).toBe('0%')
    expect(fill()!.classList.contains('scan-progress__fill--paused')).toBe(false)

    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'השהיה' })))
    expect(fill()!.classList.contains('scan-progress__fill--paused')).toBe(true)

    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'המשך' })))
    expect(fill()!.classList.contains('scan-progress__fill--paused')).toBe(false)
  })

  it('jumps to 100% when the scan finishes with fewer than 500 results and stays blue', async () => {
    await openRoot()
    await searchFor('report')
    expect(fill()!.style.width).toBe('100%')
    expect(fill()!.classList.contains('scan-progress__fill--paused')).toBe(false)
  })

  it('stays at its current width after a manual stop, and disappears when leaving the search', async () => {
    holdAll()
    await openRoot()
    await searchFor('rep')
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'עצירה' })))
    expect(fill()!.style.width).toBe('0%')

    await act(async () => fireEvent.click(screen.getByText('go-pc')))
    expect(fill()).toBeNull()
  })
})

describe('stop and cap messages (2.3)', () => {
  it('shows the stopped message instead of "no results" when stopped with nothing found', async () => {
    let release!: () => void
    gate = { wait: new Promise<void>((resolve) => (release = resolve)), release }
    await openRoot()
    await searchFor('rep')
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'עצירה' })))
    expect(document.querySelector('.empty__title')!.textContent).toBe('הסריקה הופסקה — ייתכנו תוצאות נוספות')
    expect(screen.queryByText('לא נמצאו תוצאות')).toBeNull()
  })

  it('caps at 500 results with the message, keeps the results and fills the bar', async () => {
    const original = listings.root
    listings.root = [file(root, 'Report.pdf'), ...Array.from({ length: 600 }, (_, i) => file(root, `cap${i}.txt`))]
    try {
      await openRoot()
      await searchFor('cap')
      expect(document.querySelector('.results-notice')!.textContent).toBe('הוצגו 500 תוצאות — יש עוד. צמצמו את החיפוש')
      expect(screen.getByRole('status').textContent).toBe('הוצגו 500 תוצאות — יש עוד. צמצמו את החיפוש')
      expect(within(screen.getByRole('table', { name: 'תוצאות החיפוש' })).getAllByRole('row')).toHaveLength(501)
      expect(document.querySelector<HTMLElement>('.scan-progress__fill')!.style.width).toBe('100%')
      expect(screen.queryByRole('button', { name: 'עצירה' })).toBeNull()
      expect(screen.getByText('500 תוצאות')).toBeTruthy()
    } finally {
      listings.root = original
    }
  })
})


describe('sort by proximity (3.3)', () => {
  const sortButton = () => screen.getByRole('button', { name: 'מיון לפי קרבה' }) as HTMLButtonElement
  const names = () => resultNames()

  async function withListings(run: () => Promise<void>) {
    const original = [listings.root, listings[reports.id]]
    listings.root = [file(root, 'Report.pdf'), file(root, 'abcdef.txt'), folder(reports)]
    listings[reports.id] = [file(reports, 'abc.txt')]
    try {
      await run()
    } finally {
      ;[listings.root, listings[reports.id]] = original
    }
  }

  it('is always visible; disabled with a hint while scanning and for an empty session', async () => {
    let release!: () => void
    gate = { wait: new Promise<void>((resolve) => (release = resolve)), release }
    await openRoot()
    await searchFor('rep')
    expect(sortButton().disabled).toBe(true)
    expect(sortButton().getAttribute('title')).toBe('המיון יהיה זמין בסיום הסריקה')

    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'עצירה' })))
    expect(sortButton().disabled).toBe(true) // סשן ריק
  })

  it('stays in arrival order until clicked; then sorts by score, keeps the underline and does not auto-resort', async () => {
    await withListings(async () => {
      await openRoot()
      await searchFor('abc')
      expect(names()).toEqual(['abcdef.txt', 'abc.txt'])
      expect(sortButton().disabled).toBe(false)
      expect(sortButton().classList.contains('sort-button--active')).toBe(false)

      await act(async () => fireEvent.click(sortButton()))
      expect(names()).toEqual(['abc.txt', 'abcdef.txt'])
      expect(sortButton().classList.contains('sort-button--active')).toBe(true)
      expect(sortButton().getAttribute('aria-pressed')).toBe('true')
    })
  })

  it('stays visible and disabled on the "no results" screen', async () => {
    await openRoot()
    await searchFor('zzz')
    expect(screen.getByText('לא נמצאו תוצאות')).toBeTruthy()
    expect(sortButton().disabled).toBe(true)
  })
})


describe('choice dialog and go to location (4.2)', () => {
  const dialog = () => screen.queryByRole('dialog', { name: 'בחירת פעולה לתוצאה' })
  const resultRow = (name: string) =>
    within(screen.getByRole('table', { name: 'תוצאות החיפוש' }))
      .getAllByRole('row')
      .find((r) => r.querySelector('.ellipsis')?.textContent === name)!

  async function openResults() {
    await openRoot()
    await searchFor('report')
  }

  it('double click on a file offers preview and go-to-location; a folder only go-to-location', async () => {
    await openResults()
    await act(async () => fireEvent.doubleClick(resultRow('report-final.pdf')))
    expect(within(dialog()!).getByRole('button', { name: 'תצוגה מקדימה' })).toBeTruthy()
    expect(within(dialog()!).getByRole('button', { name: 'מעבר למיקום' })).toBeTruthy()

    act(() => void fireEvent.keyDown(document, { key: 'Escape' }))
    expect(dialog()).toBeNull()

    await act(async () => fireEvent.doubleClick(resultRow('Reports')))
    expect(within(dialog()!).queryByRole('button', { name: 'תצוגה מקדימה' })).toBeNull()
    expect(within(dialog()!).getByRole('button', { name: 'מעבר למיקום' })).toBeTruthy()
  })

  it('closes on Escape and on a click outside', async () => {
    await openResults()
    await act(async () => fireEvent.doubleClick(resultRow('Report.pdf')))
    expect(dialog()).not.toBeNull()
    act(() => void fireEvent.mouseDown(document.body))
    expect(dialog()).toBeNull()
  })

  it('"preview" closes the dialog and selects the result', async () => {
    await openResults()
    await act(async () => fireEvent.doubleClick(resultRow('Report.pdf')))
    await act(async () => fireEvent.click(within(dialog()!).getByRole('button', { name: 'תצוגה מקדימה' })))
    expect(dialog()).toBeNull()
    expect(resultRow('Report.pdf').getAttribute('aria-selected')).toBe('true')
  })

  it('"go to location" shows the file folder with the file selected, keeping the search session', async () => {
    await openResults()
    await act(async () => fireEvent.doubleClick(resultRow('report-final.pdf')))
    await act(async () => fireEvent.click(within(dialog()!).getByRole('button', { name: 'מעבר למיקום' })))
    await flush()

    expect(inResults()).toBeNull()
    expect(within(address()).getByText('Reports')).toBeTruthy()
    const list = screen.getByRole('table', { name: 'תוכן התיקייה' })
    const selectedRow = within(list).getAllByRole('row').find((r) => r.getAttribute('aria-selected') === 'true')!
    expect(selectedRow.textContent).toContain('report-final.pdf')

    // אחורה (4.3) חוזר לתוצאות אותו סשן: הסשן לא נוקה במעבר
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'חזרה' })))
    await flush()
    expect(resultNames()).toEqual(['Report.pdf', 'Reports', 'report-final.pdf'])
  })
})
