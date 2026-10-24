// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { FileSystemAdapter } from '../lib/fileSystem'
import type { FileSystemEntry, FolderRef } from '../lib/models/entry'
import { jpegWithExif, pdf, png } from '../lib/testFixtures'
import { ExplorerProvider, useExplorer } from '../state/ExplorerContext'
import { DetailsPane } from './DetailsPane'
import { FileList } from './FileList'

const root: FolderRef = { id: 'root', name: 'Root', parent: null }
const docs: FolderRef = { id: 'root/Documents', name: 'Documents', parent: root }

function fileEntry(parent: FolderRef, name: string, size: number): FileSystemEntry {
  return {
    id: `${parent.id}/${name}`,
    name,
    kind: 'file',
    size,
    modified: Date.UTC(2026, 0, 15, 10, 0),
    extension: name.slice(name.lastIndexOf('.') + 1).toLowerCase(),
  }
}

const listings: Record<string, FileSystemEntry[]> = {
  root: [
    { id: docs.id, name: 'Documents', kind: 'folder', extension: '', folder: docs },
    fileEntry(root, 'Vacation.jpg', 3 * 1024 * 1024),
    fileEntry(root, 'Logo.png', 1024 * 1024),
    fileEntry(root, 'Other.jpg', 2 * 1024 * 1024),
    fileEntry(root, 'Broken.jpg', 1024 * 1024),
    fileEntry(root, 'notes.xyz', 1024 * 1024),
  ],
  [docs.id]: [fileEntry(docs, 'Report.pdf', 5 * 1024 * 1024)],
}

const contents: Record<string, Uint8Array> = {
  'Vacation.jpg': jpegWithExif('Canon'),
  'Other.jpg': jpegWithExif('Nikon'),
  'Logo.png': png(),
  'Broken.jpg': new Uint8Array([1, 2, 3]),
  'Report.pdf': pdf(2),
}

/** קריאות getFile ממתינות עד שהבדיקה משחררת אותן, כדי לשלוט בסדר הסיום. */
let pending: Array<{ name: string; resolve: () => void; reject: () => void }>
let autoResolve: boolean

const adapter: FileSystemAdapter = {
  isSupported: () => true,
  pickFolder: async () => root,
  listEntries: async (folder) => listings[folder.id] ?? [],
  listSubfolders: async () => [],
  listNames: async () => [],
  getFile: (entry) =>
    new Promise<File>((resolve, reject) => {
      const file = new File([(contents[entry.name] ?? new Uint8Array()) as BlobPart], entry.name)
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
  await screen.findByText('Vacation.jpg')
}

const row = (name: string) => within(screen.getByRole('table')).getByText(name)
const details = () => screen.queryByRole('complementary', { name: 'פרטי קובץ' })
const pane = () => {
  const element = details()
  if (!element) throw new Error('details pane is not shown')
  return within(element)
}

async function select(name: string) {
  await act(async () => fireEvent.click(row(name)))
}

async function loadImage() {
  const img = await pane().findByRole('img', { hidden: true })
  await act(async () => fireEvent.load(img))
}

beforeEach(() => {
  pending = []
  autoResolve = true
  let next = 0
  URL.createObjectURL = vi.fn(() => `blob:test/${++next}`)
  URL.revokeObjectURL = vi.fn()
})

afterEach(cleanup)

describe('FileInfo in the details pane', () => {
  it('shows the selected file details: type, app, relative path, size in MB and date', async () => {
    await openRoot()
    await act(async () => fireEvent.doubleClick(row('Documents')))
    await screen.findByText('Report.pdf')
    await select('Report.pdf')

    const info = pane()
    expect(info.getByText('מסמך PDF')).toBeTruthy()
    expect(info.getByText('Adobe Acrobat Reader')).toBeTruthy()
    expect(info.getByText('Documents/Report.pdf')).toBeTruthy()
    expect(info.getByText('5 MB')).toBeTruthy()
    expect(info.getByText('תאריך שינוי')).toBeTruthy()
    expect(await info.findByText('מספר עמודים: 2')).toBeTruthy()
    expect(info.queryByText('נתוני EXIF')).toBeNull()
  })

  it('hides the open-with field for an unknown extension', async () => {
    await openRoot()
    await select('notes.xyz')
    expect(pane().getByText('קובץ XYZ')).toBeTruthy()
    expect(pane().queryByText('נפתח באמצעות')).toBeNull()
  })

  it('replaces the previous file details when another file is selected', async () => {
    await openRoot()
    await select('Vacation.jpg')
    await pane().findByText('Canon')
    await select('notes.xyz')

    // השם מופיע בכותרת, בשדה השם ובשדה המיקום (קובץ בשורש).
    expect(pane().getAllByText('notes.xyz')).toHaveLength(3)
    expect(pane().getByText('קובץ XYZ')).toBeTruthy()
    expect(pane().queryByText('Vacation.jpg')).toBeNull()
    expect(pane().queryByText('Canon')).toBeNull()
  })

  it('clears the details when a folder is selected or opened', async () => {
    await openRoot()
    await select('Vacation.jpg')
    await loadImage()
    expect(details()).not.toBeNull()

    await select('Documents')
    expect(details()).toBeNull()

    await select('Vacation.jpg')
    await act(async () => fireEvent.doubleClick(row('Documents')))
    await screen.findByText('Report.pdf')
    expect(details()).toBeNull()
  })

  it('shows dimensions and all EXIF tags for an image with EXIF', async () => {
    await openRoot()
    await select('Vacation.jpg')

    const info = pane()
    expect(await info.findByText('Canon')).toBeTruthy()
    expect(info.getByText('EOS')).toBeTruthy()
    expect(info.getByText('סיבוב 90° עם כיוון השעון')).toBeTruthy()
    expect(info.getByText('40 פיקסלים')).toBeTruthy()
    expect(info.getByText('30 פיקסלים')).toBeTruthy()
    expect(info.getByText('Microsoft Photos')).toBeTruthy()
  })

  it('shows a message for an image without EXIF', async () => {
    await openRoot()
    await select('Logo.png')

    expect(await pane().findByText('אין נתוני EXIF זמינים בקובץ זה.')).toBeTruthy()
    expect(pane().getByText('10 פיקסלים')).toBeTruthy()
    expect(pane().getByText('20 פיקסלים')).toBeTruthy()
  })

  it('shows a preview for an image, with a loading indicator until it loads', async () => {
    await openRoot()
    await select('Logo.png')

    expect(pane().getByText('טוען תצוגה מקדימה...')).toBeTruthy()
    const img = await pane().findByRole('img', { hidden: true })
    expect(img.getAttribute('alt')).toBe('תצוגה מקדימה של Logo.png')
    expect(img.getAttribute('src')).toMatch(/^blob:test\//)
    await loadImage()
    expect(pane().queryByText('טוען תצוגה מקדימה...')).toBeNull()
    expect(pane().getByRole('img')).toBeTruthy()
  })

  it('shows a message when the preview fails, without hiding the other details', async () => {
    await openRoot()
    await select('Broken.jpg')
    const img = await pane().findByRole('img', { hidden: true })
    await act(async () => fireEvent.error(img))

    expect(pane().getByText('לא ניתן להציג את התמונה.')).toBeTruthy()
    expect(pane().getByText('אין נתוני EXIF זמינים בקובץ זה.')).toBeTruthy()
    expect(pane().getByText('1 MB')).toBeTruthy()
  })

  it('keeps the basic details when the file cannot be read', async () => {
    autoResolve = false
    await openRoot()
    await select('Vacation.jpg')
    expect(pane().getByText('3 MB')).toBeTruthy()
    expect(pane().getByText('טוען נתוני EXIF...')).toBeTruthy()

    await act(async () => pending[0].reject())
    expect(pane().getAllByText('לא ניתן לקרוא את הקובץ.').length).toBeGreaterThan(0)
    expect(pane().getByText('3 MB')).toBeTruthy()
    expect(pane().getByText('תמונת JPEG')).toBeTruthy()
  })

  it('removes the previous preview and image data when a non-image is selected', async () => {
    await openRoot()
    await select('Vacation.jpg')
    await loadImage()
    await pane().findByText('Canon')

    await select('notes.xyz')
    expect(pane().queryByRole('img', { hidden: true })).toBeNull()
    expect(pane().queryByText('תצוגה מקדימה')).toBeNull()
    expect(pane().queryByText('Canon')).toBeNull()
    expect(pane().queryByText('40 פיקסלים')).toBeNull()
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:test/1')
  })

  it('never shows stale data when two files are selected quickly', async () => {
    autoResolve = false
    await openRoot()
    await select('Vacation.jpg')
    await select('Other.jpg')
    expect(pending.map((p) => p.name)).toEqual(['Vacation.jpg', 'Other.jpg'])

    // הקובץ השני מסתיים ראשון, והראשון מסתיים באיחור.
    await act(async () => pending[1].resolve())
    expect(await pane().findByText('Nikon')).toBeTruthy()
    await act(async () => pending[0].resolve())
    await act(async () => {})

    expect(pane().getByText('Nikon')).toBeTruthy()
    expect(pane().queryByText('Canon')).toBeNull()
    expect(pane().queryByText('Vacation.jpg')).toBeNull()
    const img = pane().getByRole('img', { hidden: true })
    expect(img.getAttribute('alt')).toBe('תצוגה מקדימה של Other.jpg')
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1)
  })
})
