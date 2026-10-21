// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { FileSystemAdapter } from '../lib/fileSystem'
import type { FileSystemEntry, FolderRef } from '../lib/models/entry'
import { pdf, png } from '../lib/testFixtures'
import { ExplorerProvider, useExplorer } from '../state/ExplorerContext'
import { DetailsPane } from './DetailsPane'
import { FileList } from './FileList'

const root: FolderRef = { id: 'root', name: 'Root', parent: null }

const fileEntry = (name: string, size: number): FileSystemEntry => ({
  id: `root/${name}`,
  name,
  kind: 'file',
  size,
  modified: Date.UTC(2026, 0, 15, 10, 0),
  extension: name.slice(name.lastIndexOf('.') + 1).toLowerCase(),
})

const names = ['A.pdf', 'B.pdf', 'Big.pdf', 'Bad.pdf', 'Pic.png', 'notes.xyz']
const listing = names.map((name) => fileEntry(name, 1024))

const contents: Record<string, Uint8Array> = {
  'A.pdf': pdf(3),
  'B.pdf': pdf(5),
  'Big.pdf': pdf(2, 600_000),
  'Bad.pdf': new Uint8Array([1, 2, 3]),
  'Pic.png': png(),
}

/** קריאות getFile ממתינות עד שהבדיקה משחררת אותן, כדי לשלוט בסדר הסיום. */
let pending: Array<{ name: string; resolve: () => void; reject: () => void }>
let autoResolve: boolean
/** חתיכות הקובץ הגדול (אחרי הראשונה) ממתינות עד שהשער נפתח, כדי לראות התקדמות באמצע הטעינה. */
let openGate: () => void
let gate: Promise<void>

function gatedFile(name: string): File {
  const file = new File([contents[name] as BlobPart], name)
  const slice = file.slice.bind(file)
  file.slice = (start?: number, end?: number) => {
    const part = slice(start, end)
    if (!start) return part
    const original = part.arrayBuffer.bind(part)
    Object.defineProperty(part, 'arrayBuffer', { value: () => gate.then(original) })
    return part
  }
  return file
}

const plainFile = (name: string) => new File([(contents[name] ?? new Uint8Array()) as BlobPart], name)

const adapter: FileSystemAdapter = {
  isSupported: () => true,
  pickFolder: async () => root,
  listEntries: async () => listing,
  listSubfolders: async () => [],
  getFile: (entry) =>
    new Promise<File>((resolve, reject) => {
      const file = entry.name === 'Big.pdf' ? gatedFile(entry.name) : plainFile(entry.name)
      if (autoResolve) resolve(file)
      else pending.push({ name: entry.name, resolve: () => resolve(file), reject: () => reject(new Error('fail')) })
    }),
}

function Harness() {
  const { actions, location } = useExplorer()
  return (
    <>
      <button type="button" onClick={() => void actions.pickFolder()}>pick</button>
      {location.type === 'folder' && <FileList />}
      <DetailsPane />
    </>
  )
}

async function openRoot() {
  render(
    <ExplorerProvider adapter={adapter}>
      <Harness />
    </ExplorerProvider>,
  )
  await act(async () => fireEvent.click(screen.getByText('pick')))
  await screen.findByText('A.pdf')
}

const row = (name: string) => within(screen.getByRole('table')).getByText(name)
const pane = () => {
  const element = screen.queryByRole('complementary', { name: 'פרטי קובץ' })
  if (!element) throw new Error('details pane is not shown')
  return within(element)
}
const previewShown = () => screen.queryByLabelText('תצוגה מקדימה') !== null
const frame = (name: string) => pane().getByTitle(`תצוגה מקדימה של ${name}`)
const ERROR = 'לא ניתן לטעון את הקובץ'

async function select(name: string) {
  await act(async () => fireEvent.click(row(name)))
}

beforeEach(() => {
  pending = []
  autoResolve = true
  gate = new Promise<void>((resolve) => {
    openGate = resolve
  })
  let next = 0
  URL.createObjectURL = vi.fn(() => `blob:test/${++next}`)
  URL.revokeObjectURL = vi.fn()
})

afterEach(() => {
  vi.useRealTimers()
  cleanup()
})

describe('PDF preview in the details pane', () => {
  it('shows a valid PDF in the preview pane through a blob URL', async () => {
    await openRoot()
    await select('A.pdf')

    const viewer = await pane().findByTitle('תצוגה מקדימה של A.pdf')
    expect(viewer.tagName).toBe('IFRAME')
    expect(viewer.getAttribute('src')).toMatch(/^blob:test\//)
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1)
  })

  it('shows the file name and the page count above the preview', async () => {
    await openRoot()
    await select('A.pdf')
    await pane().findByTitle('תצוגה מקדימה של A.pdf')

    const name = document.querySelector('.pdf-preview__name')
    expect(name?.textContent).toBe('A.pdf')
    expect(pane().getByText('מספר עמודים: 3')).toBeTruthy()
    // השם והעמודים מופיעים לפני הצופה במסמך.
    expect(name?.compareDocumentPosition(frame('A.pdf')) ?? 0).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
  })

  it('shows an image correctly after a PDF', async () => {
    await openRoot()
    await select('A.pdf')
    await pane().findByTitle('תצוגה מקדימה של A.pdf')
    await select('Pic.png')

    const img = await pane().findByRole('img', { hidden: true })
    expect(img.getAttribute('alt')).toBe('תצוגה מקדימה של Pic.png')
    expect(pane().queryByTitle('תצוגה מקדימה של A.pdf')).toBeNull()
    expect(pane().queryByText(/מספר עמודים/)).toBeNull()
    await act(async () => fireEvent.load(img))
    expect(pane().getByRole('img')).toBeTruthy()
  })

  it('updates the preview and the file details when switching between two PDFs', async () => {
    await openRoot()
    await select('A.pdf')
    await pane().findByText('מספר עמודים: 3')
    await select('B.pdf')

    expect(await pane().findByText('מספר עמודים: 5')).toBeTruthy()
    expect(pane().queryByText('מספר עמודים: 3')).toBeNull()
    expect(pane().queryByTitle('תצוגה מקדימה של A.pdf')).toBeNull()
    expect(frame('B.pdf')).toBeTruthy()
    expect(document.querySelector('.pdf-preview__name')?.textContent).toBe('B.pdf')
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:test/1')
  })

  it('hides the preview pane for an unsupported file', async () => {
    await openRoot()
    await select('A.pdf')
    await pane().findByTitle('תצוגה מקדימה של A.pdf')
    expect(previewShown()).toBe(true)

    await select('notes.xyz')
    expect(previewShown()).toBe(false)
    expect(pane().queryByTitle('תצוגה מקדימה של A.pdf')).toBeNull()
  })

  it('shows a loading indicator while the PDF loads, and removes it when ready', async () => {
    autoResolve = false
    await openRoot()
    await select('A.pdf')

    expect(pane().getByRole('progressbar')).toBeTruthy()
    expect(pane().queryByTitle('תצוגה מקדימה של A.pdf')).toBeNull()

    await act(async () => pending[0].resolve())
    await pane().findByTitle('תצוגה מקדימה של A.pdf')
    expect(pane().queryByRole('progressbar')).toBeNull()
  })

  it('shows a spinner without a percentage while progress is not yet known', async () => {
    autoResolve = false
    await openRoot()
    await select('A.pdf')

    const indicator = pane().getByRole('progressbar')
    expect(indicator.hasAttribute('aria-valuenow')).toBe(false)
    expect(indicator.textContent).toBe('')
    expect(indicator.querySelector('.circular-progress__svg--spin')).not.toBeNull()
  })

  it('shows the real load progress, and the indicator disappears when loading ends', async () => {
    await openRoot()
    await select('Big.pdf')

    // החתיכה הראשונה (256KB) נקראה, השאר ממתין: ההתקדמות היא חלק הבתים שנקראו.
    const size = contents['Big.pdf'].length
    const expected = String(Math.round((262_144 / size) * 100))
    const bar = await pane().findByRole('progressbar')
    await vi.waitFor(() => expect(bar.getAttribute('aria-valuenow')).toBe(expected))
    expect(bar.textContent).toBe(`${expected}%`)
    expect(bar.querySelector('.circular-progress__svg--spin')).toBeNull()

    await act(async () => openGate())
    await pane().findByTitle('תצוגה מקדימה של Big.pdf')
    expect(pane().queryByRole('progressbar')).toBeNull()
    expect(pane().getByText('מספר עמודים: 2')).toBeTruthy()
  })

  it('shows an error after 60 seconds of loading, and the app stays usable', async () => {
    autoResolve = false
    await openRoot()
    vi.useFakeTimers()
    await select('A.pdf')
    expect(pane().getByRole('progressbar')).toBeTruthy()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(59_999)
    })
    expect(pane().queryByText(ERROR)).toBeNull()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1)
    })

    expect(pane().getByText(ERROR)).toBeTruthy()
    expect(pane().queryByRole('progressbar')).toBeNull()

    vi.useRealTimers()
    autoResolve = true
    await select('B.pdf')
    expect(await pane().findByText('מספר עמודים: 5')).toBeTruthy()
  })

  it('shows an error for a corrupt PDF and lets the user pick another file', async () => {
    await openRoot()
    await select('Bad.pdf')

    expect(await pane().findByText(ERROR)).toBeTruthy()
    expect(pane().queryByRole('progressbar')).toBeNull()
    expect(pane().queryByTitle('תצוגה מקדימה של Bad.pdf')).toBeNull()
    expect(pane().getByText('מסמך PDF')).toBeTruthy()

    await select('A.pdf')
    expect(await pane().findByText('מספר עמודים: 3')).toBeTruthy()
    expect(pane().queryByText(ERROR)).toBeNull()
  })

  it('shows an error when the file cannot be read, without breaking the rest of the app', async () => {
    autoResolve = false
    await openRoot()
    await select('A.pdf')
    await act(async () => pending[0].reject())

    expect(pane().getByText(ERROR)).toBeTruthy()
    expect(screen.getByRole('table')).toBeTruthy()

    autoResolve = true
    await select('Pic.png')
    expect(await pane().findByRole('img', { hidden: true })).toBeTruthy()
    expect(pane().queryByText(ERROR)).toBeNull()
  })

  it('never shows a previous file when another is selected during an async load', async () => {
    autoResolve = false
    await openRoot()
    await select('A.pdf')
    await select('B.pdf')
    expect(pending.map((p) => p.name)).toEqual(['A.pdf', 'B.pdf'])

    // הקובץ האחרון שנבחר מסתיים ראשון, והקודם מסתיים באיחור.
    await act(async () => pending[1].resolve())
    expect(await pane().findByText('מספר עמודים: 5')).toBeTruthy()
    await act(async () => pending[0].resolve())
    await act(async () => {})

    expect(pane().getByText('מספר עמודים: 5')).toBeTruthy()
    expect(pane().queryByText('מספר עמודים: 3')).toBeNull()
    expect(pane().queryByTitle('תצוגה מקדימה של A.pdf')).toBeNull()
    expect(frame('B.pdf')).toBeTruthy()
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1)
  })

  it('does not show a stale loading indicator or error from a cancelled load', async () => {
    autoResolve = false
    await openRoot()
    await select('A.pdf')
    await select('Pic.png')
    await act(async () => pending[0].reject())
    await act(async () => {})

    expect(pane().queryByText(ERROR)).toBeNull()
    expect(pane().queryByRole('progressbar')).toBeNull()
  })
})
