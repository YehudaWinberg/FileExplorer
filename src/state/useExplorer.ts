import { createContext, useContext } from 'react'
import type { FileSystemAdapter } from '../lib/fileSystem'
import type { FolderRef, Location, SpecialFolderKey } from '../lib/models/entry'
import type { SortKey } from '../lib/models/sort'
import type { ExplorerState } from './explorerReducer'

/** `user`: ניווט יזום של המשתמש (מנקה חיפוש). `result`: מעבר מתוצאה או התחלת חיפוש (לא מנקה). */
export type NavigationOrigin = 'user' | 'result'

export interface GoToOptions {
  origin?: NavigationOrigin
  /** מחליף את הרשומה הנוכחית בהיסטוריה וחותך forward. */
  replace?: boolean
  /** מזהה פריט שיסומן במיקום החדש (למשל קובץ שאליו עוברים מתוצאה). */
  select?: string
}

export interface ExplorerActions {
  pickFolder: (special?: SpecialFolderKey) => Promise<void>
  /** שער הניווט היחיד; ברירת המחדל `origin: 'user'`. */
  goTo: (location: Location, options?: GoToOptions) => void
  navigate: (location: Location) => void
  openFolder: (folder: FolderRef) => void
  back: () => void
  forward: () => void
  up: () => void
  refresh: () => void
  select: (id: string, ctrl: boolean, shift: boolean, orderedIds: string[]) => void
  clearSelection: () => void
  sortBy: (key: SortKey) => void
  toggleTypeFilter: (label: string) => void
  clearTypeFilter: () => void
  toggleNode: (folder: FolderRef) => void
  dismissNotice: () => void
}

export interface ExplorerContextValue {
  state: ExplorerState
  location: Location
  actions: ExplorerActions
  adapter: FileSystemAdapter
  supported: boolean
  /** ה-SearchProvider רושם כאן ניקוי חיפוש שרץ בכל ניווט מסוג `user`; מחזיר פונקציית ביטול רישום. */
  setUserNavigationHook: (hook: () => void) => () => void
}

export const ExplorerContext = createContext<ExplorerContextValue | null>(null)

export function useExplorer(): ExplorerContextValue {
  const value = useContext(ExplorerContext)
  if (!value) throw new Error('useExplorer must be used inside ExplorerProvider')
  return value
}
