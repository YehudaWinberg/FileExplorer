// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { FsError, type FileSystemAdapter } from '../lib/fileSystem'
import type { FileSystemEntry, FolderRef } from '../lib/models/entry'
import { getExtension } from '../lib/utils/fileTypes'
import { ExplorerProvider, useExplorer } from '../state/ExplorerContext'
import { FileList } from './FileList'
import { PARALLEL_READS } from './useLineCounts'

const root: FolderRef = { id: 'root', name: 'Root', parent: null }
const docs: FolderRef = { id: 'root/Docs', name: 'Docs', parent: root }

const file = (parent: FolderRef, name: string): FileSystemEntry => ({
  id: `${parent.id}/${name}`,
  name,
  kind: 'file',
  size: 1024,
  modified: Date.UTC(2026, 0, 15),
  extension: getExtension(name),
})

let listings: Record<string, FileSystemEntry[]>
/** תוכן הקבצים לפי מזהה. */
let contents: Record<string, string>
/** קבצים שקריאתם נכשלת. */
let failing: Set<string>
/** כאשר false, קריאות getFile ממתינות עד שהבדיקה משחררת אותן. */
let autoResolve: boolean
let pending: Array<{ id: string; resolve: () => void }>
let reads: string[]

const adapter: FileSystemAdapter = {
  isSupported: () => true,
  pickFolder: async () => root,
  listEntries: async (f) => listings[f.id] ?? [],
  listSubfolders: async () => [],
  getFile: (entry) => {
    reads.push(entry.id)
    return new Promise<File>((resolve, reject) => {
      const settle = () =>
        failing.has(entry.id)
          ? reject(new FsError('permission', 'אין הרשאת גישה לקובץ.'))
          : resolve(new File([contents[entry.id] ?? ''], entry.name))
      if (autoResolve) settle()
      else pending.push({ id: entry.id, resolve: settle })
    })
  },
}

function Harness() {
  const { actions, location } = useExplorer()
  return (
    <>
      <button type="button" onClick={() => void actions.pickFolder()}>pick</button>
      <button type="button" onClick={actions.up}>up</button>
      {location.type === 'folder' && <FileList />}
    </>
  )
}

const table = () => within(screen.getByRole('table'))
const rowOf = (name: string) => table().getByText(name).closest('[role="row"]') as HTMLElement
const cell = (name: string) => rowOf(name).querySelector('.col-lines') as HTMLElement
const isLoading = (name: string) => cell(name).getAttribute('aria-busy') === 'true'
const release = (id: string) => act(async () => pending.find((p) => p.id === id)!.resolve())
/** זמן ארוך מחלון איחוד העדכונים, כדי לוודא שתוצאה לא הגיעה. */
const settle = () => act(() => new Promise((resolve) => setTimeout(resolve, 120)))

async function openRoot(first: string) {
  render(
    <ExplorerProvider adapter={adapter}>
      <Harness />
    </ExplorerProvider>,
  )
  await act(async () => fireEvent.click(screen.getByText('pick')))
  await screen.findByText(first)
}

beforeEach(() => {
  listings = {}
  contents = {}
  failing = new Set()
  autoResolve = true
  pending = []
  reads = []
})

afterEach(cleanup)

describe('line count column', () => {
  it('shows the column, counts TXT files (case-insensitive) and shows a dash for everything else', async () => {
    const big = Array.from({ length: 1234 }, (_, i) => `line ${i}`).join('\n')
    listings.root = [
      { id: docs.id, name: 'Docs', kind: 'folder', extension: '', folder: docs },
      file(root, 'notes.txt'),
      file(root, 'README.TXT'),
      file(root, 'empty.txt'),
      file(root, 'trailing.txt'),
      file(root, 'big.txt'),
      file(root, 'Report.pdf'),
      file(root, 'notes.md'),
      file(root, 'app.log'),
    ]
    Object.assign(contents, {
      'root/notes.txt': 'Hello\n\nWorld',
      'root/README.TXT': 'a\r\nb\r\nc',
      'root/empty.txt': '',
      'root/trailing.txt': 'Hello\n',
      'root/big.txt': big,
      'root/notes.md': 'a\nb\nc',
      'root/app.log': 'a\nb\nc',
    })
    await openRoot('notes.txt')

    expect(table().getByRole('columnheader', { name: 'מספר שורות' })).toBeTruthy()
    await waitFor(() => expect(cell('notes.txt').textContent).toBe('3'))
    expect(cell('README.TXT').textContent).toBe('3')
    expect(cell('empty.txt').textContent).toBe('0')
    expect(cell('trailing.txt').textContent).toBe('1')
    expect(cell('big.txt').textContent).toBe('1,234')
    for (const name of ['Docs', 'Report.pdf', 'notes.md', 'app.log']) expect(cell(name).textContent).toBe('—')
    expect(reads.sort()).toEqual(['root/README.TXT', 'root/big.txt', 'root/empty.txt', 'root/notes.txt', 'root/trailing.txt'])
  })

  it('shows the list right away with a loading indicator, then updates the cell', async () => {
    autoResolve = false
    listings.root = [file(root, 'a.txt'), file(root, 'b.txt'), file(root, 'Report.pdf')]
    contents['root/a.txt'] = 'Hello\nWorld'
    contents['root/b.txt'] = 'Hello'
    await openRoot('a.txt')

    expect(table().getByText('b.txt')).toBeTruthy()
    expect(table().getByText('Report.pdf')).toBeTruthy()
    expect(isLoading('a.txt')).toBe(true)
    expect(isLoading('b.txt')).toBe(true)
    expect(cell('a.txt').getAttribute('aria-label')).toBe('סופר שורות...')
    expect(isLoading('Report.pdf')).toBe(false)

    await release('root/a.txt')
    await waitFor(() => expect(cell('a.txt').textContent).toBe('2'))
    expect(isLoading('a.txt')).toBe(false)
    expect(isLoading('b.txt')).toBe(true)

    await release('root/b.txt')
    await waitFor(() => expect(cell('b.txt').textContent).toBe('1'))
  })

  it('shows an error indicator for a file that cannot be read, without affecting the rest', async () => {
    listings.root = [file(root, 'locked.txt'), file(root, 'ok.txt'), file(root, 'Report.pdf')]
    contents['root/ok.txt'] = 'a\nb'
    failing.add('root/locked.txt')
    await openRoot('locked.txt')

    await waitFor(() => expect(cell('locked.txt').textContent).toBe('שגיאת קריאה'))
    expect(cell('locked.txt').title).toBe('אין הרשאת גישה לקובץ.')
    expect(cell('ok.txt').textContent).toBe('2')
    expect(cell('Report.pdf').textContent).toBe('—')
    expect(table().getAllByRole('row')).toHaveLength(4)
  })

  it('never shows late results from the previous folder after navigating', async () => {
    autoResolve = false
    listings.root = [{ id: docs.id, name: 'Docs', kind: 'folder', extension: '', folder: docs }, file(root, 'notes.txt')]
    listings[docs.id] = [file(docs, 'notes.txt')]
    contents['root/notes.txt'] = '1\n2\n3\n4\n5'
    contents['root/Docs/notes.txt'] = 'only one'
    await openRoot('notes.txt')

    await act(async () => fireEvent.doubleClick(table().getByText('Docs')))
    await waitFor(() => expect(table().queryByText('Docs')).toBeNull())
    expect(isLoading('notes.txt')).toBe(true)

    // הספירה של התיקייה הקודמת מסתיימת באיחור ואסור שתוצג.
    await release('root/notes.txt')
    await settle()
    expect(isLoading('notes.txt')).toBe(true)

    await release('root/Docs/notes.txt')
    await waitFor(() => expect(cell('notes.txt').textContent).toBe('1'))

    // חזרה לתיקייה הקודמת מתחילה ספירה חדשה במקום להציג תוצאות שמורות.
    await act(async () => fireEvent.click(screen.getByText('up')))
    await screen.findByText('Docs')
    expect(isLoading('notes.txt')).toBe(true)
    const again = pending.filter((p) => p.id === 'root/notes.txt')
    expect(again).toHaveLength(2)
    await act(async () => again[1].resolve())
    await waitFor(() => expect(cell('notes.txt').textContent).toBe('5'))
  })

  it(`reads at most ${PARALLEL_READS} files at a time`, async () => {
    autoResolve = false
    const names = Array.from({ length: PARALLEL_READS + 2 }, (_, i) => `f${i}.txt`)
    listings.root = names.map((n) => file(root, n))
    await openRoot('f0.txt')

    await waitFor(() => expect(pending).toHaveLength(PARALLEL_READS))
    await act(async () => pending[0].resolve())
    await waitFor(() => expect(pending).toHaveLength(PARALLEL_READS + 1))
    for (const p of pending.slice(1)) await act(async () => p.resolve())
    await waitFor(() => expect(pending).toHaveLength(names.length))
    for (const p of pending.slice(PARALLEL_READS + 1)) await act(async () => p.resolve())
    await waitFor(() => names.forEach((n) => expect(cell(n).textContent).toBe('0')))
  })

  it('does not re-read files when searching, and keeps the counts', async () => {
    listings.root = [file(root, 'alpha.txt'), file(root, 'beta.txt')]
    contents['root/alpha.txt'] = 'a\nb'
    await openRoot('alpha.txt')
    await waitFor(() => expect(cell('alpha.txt').textContent).toBe('2'))
    const before = reads.length

    const search = screen.getByRole('searchbox', { name: 'חיפוש בתיקייה הנוכחית' })
    await act(async () => fireEvent.change(search, { target: { value: 'alp' } }))
    expect(table().queryByText('beta.txt')).toBeNull()
    expect(cell('alpha.txt').textContent).toBe('2')
    await act(async () => fireEvent.change(search, { target: { value: '' } }))
    expect(cell('beta.txt').textContent).toBe('0')
    expect(reads).toHaveLength(before)
  })
})
