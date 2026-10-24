import { FsError, type FileSystemAdapter } from './fileSystem'
import type { FileSystemEntry, FolderRef, SpecialFolderKey } from './models/entry'
import { getExtension } from './utils/fileTypes'

interface PickerOptions {
  id?: string
  mode?: 'read'
  startIn?: string
}

type PickerHost = {
  showDirectoryPicker?: (options?: PickerOptions) => Promise<FileSystemDirectoryHandle>
}

interface PermissionCapableHandle {
  queryPermission?(descriptor: { mode: 'read' }): Promise<PermissionState>
  requestPermission?(descriptor: { mode: 'read' }): Promise<PermissionState>
}

function errorName(error: unknown): string {
  return error instanceof DOMException ? error.name : ''
}

function toFsError(error: unknown): FsError {
  if (error instanceof FsError) return error
  const name = errorName(error)
  if (name === 'NotAllowedError' || name === 'SecurityError') {
    return new FsError('permission', 'אין הרשאת גישה לתיקייה.')
  }
  if (name === 'NotFoundError' || name === 'TypeMismatchError') {
    return new FsError('not-found', 'התיקייה לא נמצאה או שאינה נגישה.')
  }
  return new FsError('unknown', 'אירעה שגיאה בקריאת התיקייה.')
}

/**
 * מימוש מבוסס File System Access API. קריאה בלבד:
 * הבחירה מתבצעת במצב 'read' ואין שימוש בפעולות כתיבה/מחיקה.
 * ה-handles נשמרים בזיכרון בלבד ולא בין הפעלות.
 */
export class BrowserFileSystemAdapter implements FileSystemAdapter {
  private folders = new Map<string, FileSystemDirectoryHandle>()
  private files = new Map<string, FileSystemFileHandle>()
  private nextRootId = 1

  isSupported(): boolean {
    return typeof (globalThis as PickerHost).showDirectoryPicker === 'function'
  }

  async pickFolder(startIn?: SpecialFolderKey): Promise<FolderRef | null> {
    const host = globalThis as PickerHost
    if (!host.showDirectoryPicker) throw new FsError('unsupported', 'הדפדפן אינו תומך בבחירת תיקיות.')
    try {
      const handle = await host.showDirectoryPicker({ id: 'file-browser', mode: 'read', startIn })
      return (await this.findRoot(handle)) ?? this.addRoot(handle)
    } catch (error) {
      if (errorName(error) === 'AbortError') return null
      throw toFsError(error)
    }
  }

  private addRoot(handle: FileSystemDirectoryHandle): FolderRef {
    const ref: FolderRef = { id: `root${this.nextRootId++}`, name: handle.name, parent: null }
    this.folders.set(ref.id, handle)
    return ref
  }

  private async findRoot(handle: FileSystemDirectoryHandle): Promise<FolderRef | null> {
    for (const [id, known] of this.folders) {
      if (id.includes('/')) continue
      if (await known.isSameEntry(handle)) return { id, name: known.name, parent: null }
    }
    return null
  }

  async listEntries(folder: FolderRef): Promise<FileSystemEntry[]> {
    try {
      const dir = await this.resolve(folder)
      const items: Array<[string, FileSystemHandle]> = []
      for await (const [name, handle] of dir.entries()) items.push([name, handle])
      return await Promise.all(items.map(([name, handle]) => this.toEntry(folder, name, handle)))
    } catch (error) {
      throw toFsError(error)
    }
  }

  async listSubfolders(folder: FolderRef): Promise<FolderRef[]> {
    try {
      const dir = await this.resolve(folder)
      const result: FolderRef[] = []
      for await (const [name, handle] of dir.entries()) {
        if (handle.kind === 'directory') {
          result.push(this.registerFolder(folder, name, handle as FileSystemDirectoryHandle))
        }
      }
      return result
    } catch (error) {
      throw toFsError(error)
    }
  }

  async listNames(folder: FolderRef): Promise<FileSystemEntry[]> {
    try {
      const dir = this.folders.get(folder.id)
      if (!dir) throw new FsError('not-found', 'התיקייה לא נמצאה. נסה לבחור אותה מחדש.')
      await this.requireGrantedPermission(dir)
      const result: FileSystemEntry[] = []
      for await (const [name, handle] of dir.entries()) {
        if (handle.kind === 'directory') {
          const sub = this.registerFolder(folder, name, handle as FileSystemDirectoryHandle)
          result.push({ id: sub.id, name, kind: 'folder', extension: '', folder: sub })
        } else {
          const id = `${folder.id}/${name}`
          this.files.set(id, handle as FileSystemFileHandle)
          result.push({ id, name, kind: 'file', extension: getExtension(name) })
        }
      }
      return result
    } catch (error) {
      throw toFsError(error)
    }
  }

  async getFile(entry: FileSystemEntry): Promise<File> {
    const handle = this.files.get(entry.id)
    if (!handle) throw new FsError('not-found', 'הקובץ לא נמצא. נסה לרענן את התיקייה.')
    try {
      return await handle.getFile()
    } catch (error) {
      const name = errorName(error)
      if (name === 'NotAllowedError' || name === 'SecurityError') {
        throw new FsError('permission', 'אין הרשאת גישה לקובץ.')
      }
      if (name === 'NotFoundError') throw new FsError('not-found', 'הקובץ לא נמצא או שאינו נגיש.')
      throw new FsError('unknown', 'לא ניתן לקרוא את הקובץ.')
    }
  }

  private registerFolder(parent: FolderRef, name: string, handle: FileSystemDirectoryHandle): FolderRef {
    const ref: FolderRef = { id: `${parent.id}/${name}`, name, parent }
    this.folders.set(ref.id, handle)
    return ref
  }

  private async resolve(folder: FolderRef): Promise<FileSystemDirectoryHandle> {
    const dir = this.folders.get(folder.id)
    if (!dir) throw new FsError('not-found', 'התיקייה לא נמצאה. נסה לבחור אותה מחדש.')
    await this.ensureReadPermission(dir)
    return dir
  }

  /** בודק הרשאה קיימת בלבד, בלי להציג בקשה (סריקה לא מפריעה באמצע). */
  private async requireGrantedPermission(dir: FileSystemDirectoryHandle): Promise<void> {
    const handle = dir as FileSystemDirectoryHandle & PermissionCapableHandle
    if (!handle.queryPermission) return
    if ((await handle.queryPermission({ mode: 'read' })) !== 'granted') {
      throw new FsError('permission', 'אין הרשאת גישה לתיקייה.')
    }
  }

  private async ensureReadPermission(dir: FileSystemDirectoryHandle): Promise<void> {
    const handle = dir as FileSystemDirectoryHandle & PermissionCapableHandle
    if (!handle.queryPermission) return
    const descriptor = { mode: 'read' } as const
    if ((await handle.queryPermission(descriptor)) === 'granted') return
    if (handle.requestPermission && (await handle.requestPermission(descriptor)) === 'granted') return
    throw new FsError('permission', 'אין הרשאת גישה לתיקייה.')
  }

  private async toEntry(parent: FolderRef, name: string, handle: FileSystemHandle): Promise<FileSystemEntry> {
    if (handle.kind === 'directory') {
      const folder = this.registerFolder(parent, name, handle as FileSystemDirectoryHandle)
      return { id: folder.id, name, kind: 'folder', extension: '', folder }
    }
    const base: FileSystemEntry = {
      id: `${parent.id}/${name}`,
      name,
      kind: 'file',
      extension: getExtension(name),
    }
    this.files.set(base.id, handle as FileSystemFileHandle)
    try {
      const file = await (handle as FileSystemFileHandle).getFile()
      return { ...base, size: file.size, modified: file.lastModified, mimeType: file.type || undefined }
    } catch {
      // קובץ שאינו נגיש מוצג ללא גודל ותאריך ואינו מפיל את כל התיקייה.
      return { ...base, unreadable: true }
    }
  }
}
