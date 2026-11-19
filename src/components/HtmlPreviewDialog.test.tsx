// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { useEffect } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { FileSystemAdapter } from '../lib/fileSystem'
import type { FileSystemEntry, FolderRef } from '../lib/models/entry'
import { ExplorerProvider } from '../state/ExplorerContext'
import { useExplorer } from '../state/useExplorer'
import { FileList } from './FileList'

const root: FolderRef = { id: 'root', name: 'Root', parent: null }
const file = (name: string): FileSystemEntry => ({
  id: `root/${name}`,
  name,
  kind: 'file',
  extension: name.slice(name.lastIndexOf('.') + 1),
})

function mount(getFile = vi.fn(async (entry: FileSystemEntry) => new File(['<h1>שלום</h1>'], entry.name))) {
  const entries = [file('page.html'), file('notes.txt')]
  const adapter: FileSystemAdapter = {
    isSupported: () => true,
    pickFolder: async () => root,
    listEntries: async () => entries,
    listSubfolders: async () => [],
    listNames: async () => entries,
    getFile,
  }
  let explorer!: ReturnType<typeof useExplorer>
  function Probe() {
    const current = useExplorer()
    useEffect(() => {
      explorer = current
    })
    return null
  }
  render(
    <ExplorerProvider adapter={adapter}>
      <Probe />
      <FileList />
    </ExplorerProvider>,
  )
  act(() => explorer.actions.goTo({ type: 'folder', folder: root }))
  return { getFile }
}

const rowOf = async (name: string) =>
  (await screen.findAllByRole('row')).find((r) => within(r).queryByText(name))!

beforeEach(() => {
  URL.createObjectURL = vi.fn(() => 'blob:preview')
  URL.revokeObjectURL = vi.fn()
})
afterEach(cleanup)

describe('HtmlPreviewDialog', () => {
  it('opens a sandboxed preview dialog on double click of an html file and closes with X', async () => {
    mount()
    fireEvent.doubleClick(await rowOf('page.html'))
    const dialog = await screen.findByRole('dialog', { name: 'תצוגה מקדימה של page.html' })
    const frame = await within(dialog).findByTitle('תוכן page.html')
    expect(frame.getAttribute('src')).toBe('blob:preview')
    expect(frame.getAttribute('sandbox')).toBe('')

    fireEvent.click(within(dialog).getByRole('button', { name: 'סגירה' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:preview')
  })

  it('closes on Escape', async () => {
    mount()
    fireEvent.doubleClick(await rowOf('page.html'))
    await screen.findByRole('dialog')
    fireEvent.keyDown(document, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })

  it('does not open for non-html files', async () => {
    mount()
    fireEvent.doubleClick(await rowOf('notes.txt'))
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('shows an error message when the file cannot be read', async () => {
    mount(vi.fn(async () => { throw new Error('boom') }))
    fireEvent.doubleClick(await rowOf('page.html'))
    expect(await screen.findByText('לא ניתן לקרוא את הקובץ.')).toBeTruthy()
  })

  it('refuses files above the size cap without reading them', async () => {
    const big = new File(['x'], 'page.html')
    Object.defineProperty(big, 'size', { value: 6 * 1024 * 1024 })
    mount(vi.fn(async () => big))
    fireEvent.doubleClick(await rowOf('page.html'))
    expect(await screen.findByText(/גדול מדי/)).toBeTruthy()
  })

  it('keeps Escape inside the dialog and restores focus to the opener on close', async () => {
    mount()
    const behind = vi.fn()
    document.addEventListener('keydown', behind)
    fireEvent.doubleClick(await rowOf('page.html'))
    await screen.findByRole('dialog')
    fireEvent.keyDown(document.body, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(behind).not.toHaveBeenCalled()
    document.removeEventListener('keydown', behind)
  })
})
