// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { FileSystemAdapter } from '../lib/fileSystem'
import type { FileSystemEntry, FolderRef } from '../lib/models/entry'
import { jpegWithExif } from '../lib/testFixtures'
import { ExplorerProvider, useExplorer } from '../state/ExplorerContext'
import { DetailsPane } from './DetailsPane'
import { FileList } from './FileList'

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
  root: [
    file(root, 'Report.pdf'),
    file(root, 'AnnualReport.xlsx'),
    file(root, 'photo.jpg'),
    file(root, 'PHOTO-final.png'),
    file(root, 'aba.txt'),
    file(root, 'notes.txt'),
    folder(reports),
    folder({ id: 'root/Images', name: 'Images', parent: root }),
    folder({ id: 'root/ABA-Folder', name: 'ABA-Folder', parent: root }),
  ],
  [reports.id]: [file(reports, 'q1.txt'), file(reports, 'repo-notes.txt')],
}

/** קריאות getFile ממתינות עד שהבדיקה משחררת אותן. */
let pending: Array<{ name: string; resolve: () => void }>

const adapter: FileSystemAdapter = {
  isSupported: () => true,
  pickFolder: async () => root,
  listEntries: async (f) => listings[f.id] ?? [],
  listSubfolders: async () => [],
  listNames: async () => [],
  getFile: (entry) =>
    new Promise<File>((resolve) => {
      const content = entry.name.endsWith('.jpg') ? jpegWithExif('Canon') : new Uint8Array()
      pending.push({ name: entry.name, resolve: () => resolve(new File([content as BlobPart], entry.name)) })
    }),
}

function Harness() {
  const { actions, location } = useExplorer()
  return (
    <>
      <button type="button" onClick={() => void actions.pickFolder()}>pick</button>
      <button type="button" onClick={actions.up}>up</button>
      {location.type === 'folder' && <FileList />}
      <DetailsPane />
    </>
  )
}

const NO_RESULTS = 'אין פריטים התואמים לחיפוש שלך'
const searchBox = () => screen.getByRole('searchbox', { name: 'חיפוש בתיקייה הנוכחית' }) as HTMLInputElement
const clearButton = () => screen.queryByRole('button', { name: 'ניקוי החיפוש' })
const details = () => screen.queryByRole('complementary', { name: 'פרטי קובץ' })
const visibleNames = () =>
  within(screen.getByRole('table'))
    .queryAllByRole('row')
    .filter((r) => r.hasAttribute('aria-selected'))
    .map((r) => r.querySelector('.cell-name span')?.textContent)
const row = (name: string) => within(screen.getByRole('table')).getByText(name)
const isSelected = (name: string) => row(name).closest('[role="row"]')?.getAttribute('aria-selected')

async function type(text: string) {
  await act(async () => fireEvent.change(searchBox(), { target: { value: text } }))
}

/** סדר הרשימה המלאה כפי שהוצגה לפני החיפוש. */
let ALL: Array<string | null | undefined>

/** הפריטים הצפויים לפי סדר הרשימה המלאה: החיפוש רק מסנן ולא ממיין מחדש. */
const inListOrder = (...names: string[]) => ALL.filter((n) => names.includes(n as string))

async function openRoot() {
  render(
    <ExplorerProvider adapter={adapter}>
      <Harness />
    </ExplorerProvider>,
  )
  await act(async () => fireEvent.click(screen.getByText('pick')))
  await screen.findByText('Report.pdf')
  ALL = visibleNames()
}


beforeEach(() => {
  pending = []
  URL.createObjectURL = vi.fn(() => 'blob:test/1')
  URL.revokeObjectURL = vi.fn()
})

afterEach(cleanup)

describe('search by name in the current folder', () => {
  it('shows a search field with a placeholder above the list, without a clear button while empty', async () => {
    await openRoot()
    const input = searchBox()
    expect(input.placeholder).toBe('חיפוש לפי שם בתיקייה הנוכחית')
    expect(input.compareDocumentPosition(screen.getByRole('table')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(clearButton()).toBeNull()
    expect(ALL).toHaveLength(listings.root.length)
  })

  it('filters while typing, by partial name, keeping the existing order', async () => {
    await openRoot()
    await type('r')
    expect(visibleNames()).toEqual(inListOrder('ABA-Folder', 'Reports', 'AnnualReport.xlsx', 'Report.pdf'))
    await type('re')
    expect(visibleNames()).toEqual(inListOrder('Reports', 'AnnualReport.xlsx', 'Report.pdf'))
    await type('repo')
    expect(visibleNames()).toEqual(inListOrder('Reports', 'AnnualReport.xlsx', 'Report.pdf'))
  })

  it('ignores letter case and includes folders', async () => {
    await openRoot()
    await type('ABA')
    expect(visibleNames()).toEqual(inListOrder('ABA-Folder', 'aba.txt'))
    await type('ima')
    expect(visibleNames()).toEqual(inListOrder('Images'))
  })

  it('ignores spaces around the query', async () => {
    await openRoot()
    await type('  photo  ')
    expect(visibleNames()).toEqual(inListOrder('photo.jpg', 'PHOTO-final.png'))
  })

  it('shows the exact no-results message only when a non-empty query matches nothing', async () => {
    await openRoot()
    await type('xyz123')
    expect(visibleNames()).toEqual([])
    expect(screen.getByText(NO_RESULTS)).toBeTruthy()

    await type('   ')
    expect(screen.queryByText(NO_RESULTS)).toBeNull()
    expect(visibleNames()).toEqual(ALL)
  })

  it('restores the full list when the text is deleted or X is clicked', async () => {
    await openRoot()
    await type('repo')
    await type('')
    expect(visibleNames()).toEqual(ALL)
    expect(clearButton()).toBeNull()

    await type('repo')
    await act(async () => fireEvent.click(clearButton()!))
    expect(searchBox().value).toBe('')
    expect(visibleNames()).toEqual(ALL)
    expect(clearButton()).toBeNull()
  })

  it('resets the search when opening a folder and when going up to the parent', async () => {
    await openRoot()
    await type('repo')
    await act(async () => fireEvent.doubleClick(row('Reports')))
    await screen.findByText('q1.txt')
    expect(searchBox().value).toBe('')
    expect(visibleNames()).toEqual(['q1.txt', 'repo-notes.txt'])

    await type('q1')
    await act(async () => fireEvent.click(screen.getByText('up')))
    await screen.findByText('Report.pdf')
    expect(searchBox().value).toBe('')
    expect(visibleNames()).toEqual(ALL)
  })

  it('keeps the selection and details while the selected file still matches', async () => {
    await openRoot()
    await act(async () => fireEvent.click(row('Report.pdf')))
    expect(details()).not.toBeNull()

    await type('REPORT')
    expect(isSelected('Report.pdf')).toBe('true')
    expect(within(details()!).getByText('מסמך PDF')).toBeTruthy()
  })

  it('selecting a file from the results works like a regular selection', async () => {
    await openRoot()
    await type('notes')
    await act(async () => fireEvent.click(row('notes.txt')))
    expect(isSelected('notes.txt')).toBe('true')
    expect(within(details()!).getAllByText('notes.txt').length).toBeGreaterThan(0)
  })

  it('clears the selection and details when the selected file is filtered out, ignoring late async data', async () => {
    await openRoot()
    await act(async () => fireEvent.click(row('photo.jpg')))
    expect(details()).not.toBeNull()
    // קובצי ה-TXT נקראים ברקע לספירת שורות; כאן רלוונטית רק קריאת התמונה.
    const photo = pending.filter((p) => p.name === 'photo.jpg')
    expect(photo).toHaveLength(1)

    await type('repo')
    expect(details()).toBeNull()

    // נתוני התמונה מגיעים אחרי שהבחירה בוטלה, ואסור שיופיעו.
    await act(async () => photo[0].resolve())
    await act(async () => {})
    expect(details()).toBeNull()

    await type('')
    expect(details()).toBeNull()
    expect(isSelected('photo.jpg')).toBe('false')
    expect(screen.queryByText('Canon')).toBeNull()
    expect(URL.createObjectURL).not.toHaveBeenCalled()
  })
})
