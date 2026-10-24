import { afterEach, describe, expect, it, vi } from 'vitest'
import { BrowserFileSystemAdapter } from './BrowserFileSystemAdapter'
import { FsError } from './fileSystem'

// ---------- Mocks לממשקי הדפדפן (ללא מערכת קבצים אמיתית) ----------

interface MockFile {
  name: string
  content?: string
  modified?: number
  /** שגיאה שתיזרק בקריאת הקובץ. */
  failWith?: string
}
type MockNode = MockFile | MockDir
interface MockDir {
  name: string
  children: MockNode[]
  /** שגיאה שתיזרק בקריאת התיקייה. */
  failWith?: string
  permission?: PermissionState
}

const isDir = (node: MockNode): node is MockDir => 'children' in node

function fileHandle(file: MockFile) {
  return {
    kind: 'file' as const,
    name: file.name,
    getFile: async () => {
      if (file.failWith) throw new DOMException('blocked', file.failWith)
      return new File([file.content ?? ''], file.name, { lastModified: file.modified ?? 1000 })
    },
  }
}

function dirHandle(dir: MockDir): FileSystemDirectoryHandle {
  const handle = {
    kind: 'directory' as const,
    name: dir.name,
    isSameEntry: async (other: unknown) => other === handle,
    queryPermission: async () => dir.permission ?? 'granted',
    requestPermission: async () => dir.permission ?? 'granted',
    async *entries() {
      if (dir.failWith) throw new DOMException('blocked', dir.failWith)
      for (const child of dir.children) {
        yield [child.name, isDir(child) ? dirHandle(child) : fileHandle(child)]
      }
    },
  }
  return handle as unknown as FileSystemDirectoryHandle
}

function stubPicker(result: () => Promise<FileSystemDirectoryHandle>) {
  const picker = vi.fn(result)
  vi.stubGlobal('showDirectoryPicker', picker)
  return picker
}

afterEach(() => vi.unstubAllGlobals())

const tree: MockDir = {
  name: 'Photos',
  children: [
    { name: '2026', children: [{ name: 'trip', children: [] }, { name: 'a.jpg', content: 'abc', modified: 5000 }] },
    { name: 'notes.txt', content: 'hello' },
    { name: 'locked.bin', failWith: 'NotAllowedError' },
    { name: 'empty', children: [] },
  ],
}

async function pick(root: MockDir = tree) {
  const adapter = new BrowserFileSystemAdapter()
  stubPicker(async () => dirHandle(root))
  const folder = await adapter.pickFolder()
  if (!folder) throw new Error('expected a folder')
  return { adapter, folder }
}

describe('support detection', () => {
  it('reports support only when showDirectoryPicker exists', () => {
    const adapter = new BrowserFileSystemAdapter()
    expect(adapter.isSupported()).toBe(false)
    stubPicker(async () => dirHandle(tree))
    expect(adapter.isSupported()).toBe(true)
  })

  it('throws an "unsupported" error when picking without browser support', async () => {
    await expect(new BrowserFileSystemAdapter().pickFolder()).rejects.toMatchObject({ code: 'unsupported' })
  })
})

describe('pickFolder', () => {
  it('asks for read-only access', async () => {
    const adapter = new BrowserFileSystemAdapter()
    const picker = stubPicker(async () => dirHandle(tree))
    await adapter.pickFolder('documents')
    expect(picker).toHaveBeenCalledWith({ id: 'file-browser', mode: 'read', startIn: 'documents' })
  })

  it('returns null when the user cancels the picker', async () => {
    const adapter = new BrowserFileSystemAdapter()
    stubPicker(async () => {
      throw new DOMException('cancelled', 'AbortError')
    })
    await expect(adapter.pickFolder()).resolves.toBeNull()
  })

  it('maps permission errors from the picker', async () => {
    const adapter = new BrowserFileSystemAdapter()
    stubPicker(async () => {
      throw new DOMException('denied', 'NotAllowedError')
    })
    await expect(adapter.pickFolder()).rejects.toMatchObject({ code: 'permission' })
  })

  it('does not duplicate a root that is picked twice', async () => {
    const adapter = new BrowserFileSystemAdapter()
    const handle = dirHandle(tree)
    stubPicker(async () => handle)
    const first = await adapter.pickFolder()
    const second = await adapter.pickFolder()
    expect(second?.id).toBe(first?.id)
  })
})

describe('listEntries / listSubfolders', () => {
  it('reads one level of a nested structure and loads children lazily', async () => {
    const { adapter, folder } = await pick()
    const entries = await adapter.listEntries(folder)
    expect(entries.map((e) => e.name)).toEqual(['2026', 'notes.txt', 'locked.bin', 'empty'])
    expect(entries[0]).toMatchObject({ kind: 'folder', extension: '' })
    expect(entries[1]).toMatchObject({ kind: 'file', extension: 'txt', size: 5 })

    const year = entries[0].folder!
    expect(year.parent).toBe(folder)
    const nested = await adapter.listEntries(year)
    expect(nested.map((e) => e.name)).toEqual(['trip', 'a.jpg'])
    expect(nested[1]).toMatchObject({ size: 3, modified: 5000, extension: 'jpg' })
  })

  it('lists only sub-folders for the tree', async () => {
    const { adapter, folder } = await pick()
    const subfolders = await adapter.listSubfolders(folder)
    expect(subfolders.map((f) => f.name)).toEqual(['2026', 'empty'])
  })

  it('handles an empty folder', async () => {
    const { adapter, folder } = await pick({ name: 'Empty', children: [] })
    await expect(adapter.listEntries(folder)).resolves.toEqual([])
    await expect(adapter.listSubfolders(folder)).resolves.toEqual([])
  })

  it('marks inaccessible files instead of failing the whole folder', async () => {
    const { adapter, folder } = await pick()
    const locked = (await adapter.listEntries(folder)).find((e) => e.name === 'locked.bin')
    expect(locked).toMatchObject({ kind: 'file', unreadable: true })
    expect(locked?.size).toBeUndefined()
  })

  it('reports a permission error when read access is denied', async () => {
    const { adapter, folder } = await pick({ name: 'Denied', children: [], permission: 'denied' })
    await expect(adapter.listEntries(folder)).rejects.toMatchObject({ code: 'permission' })
  })

  it('maps errors thrown while reading the directory', async () => {
    const { adapter, folder } = await pick({ name: 'Gone', children: [], failWith: 'NotFoundError' })
    const error = await adapter.listEntries(folder).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(FsError)
    expect(error).toMatchObject({ code: 'not-found' })
  })

  it('rejects folders that were never registered', async () => {
    const adapter = new BrowserFileSystemAdapter()
    await expect(adapter.listEntries({ id: 'x', name: 'x', parent: null })).rejects.toMatchObject({ code: 'not-found' })
  })
})

describe('listNames', () => {
  it('lists name, kind and id only, without reading files', async () => {
    const { adapter, folder } = await pick()
    const entries = await adapter.listNames(folder)
    expect(entries.map((e) => e.name)).toEqual(['2026', 'notes.txt', 'locked.bin', 'empty'])
    expect(entries[0]).toMatchObject({ kind: 'folder', id: `${folder.id}/2026` })
    expect(entries[1]).toMatchObject({ kind: 'file', extension: 'txt', id: `${folder.id}/notes.txt` })
    // locked.bin נכשל ב-getFile, ובכל זאת מופיע: הקובץ לא נקרא.
    expect(entries[2]).not.toHaveProperty('unreadable')
    for (const entry of entries) {
      expect(entry).not.toHaveProperty('size')
      expect(entry).not.toHaveProperty('modified')
    }
  })

  it('lets the scan descend into returned folders', async () => {
    const { adapter, folder } = await pick()
    const [year] = await adapter.listNames(folder)
    const inner = await adapter.listNames(year.folder!)
    expect(inner.map((e) => e.name)).toEqual(['trip', 'a.jpg'])
  })

  it('fails with a permission error and never asks for permission', async () => {
    const adapter = new BrowserFileSystemAdapter()
    const handle = dirHandle({ ...tree, permission: 'prompt' })
    const request = vi.spyOn(handle as unknown as { requestPermission(): Promise<string> }, 'requestPermission')
    stubPicker(async () => handle)
    const folder = (await adapter.pickFolder())!
    await expect(adapter.listNames(folder)).rejects.toMatchObject({ code: 'permission' })
    expect(request).not.toHaveBeenCalled()
  })

  it('maps read failures and unknown folders to FsError', async () => {
    const { adapter, folder } = await pick({ ...tree, failWith: 'NotFoundError' })
    await expect(adapter.listNames(folder)).rejects.toMatchObject({ code: 'not-found' })
    await expect(adapter.listNames({ id: 'nope', name: 'x', parent: null })).rejects.toMatchObject({ code: 'not-found' })
  })
})

describe('getFile', () => {
  it('returns the File of a listed entry', async () => {
    const { adapter, folder } = await pick()
    const entry = (await adapter.listEntries(folder)).find((e) => e.name === 'notes.txt')!
    const file = await adapter.getFile(entry)
    expect(await file.text()).toBe('hello')
  })

  it('maps permission errors and unknown entries', async () => {
    const { adapter, folder } = await pick()
    const locked = (await adapter.listEntries(folder)).find((e) => e.name === 'locked.bin')!
    await expect(adapter.getFile(locked)).rejects.toMatchObject({ code: 'permission' })
    await expect(
      adapter.getFile({ id: 'nope', name: 'nope', kind: 'file', extension: '' }),
    ).rejects.toMatchObject({ code: 'not-found' })
  })
})
