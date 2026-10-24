import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type MutableRefObject,
  type ReactNode,
} from 'react'
import { FsError, type FileSystemAdapter } from '../lib/fileSystem'
import type { FolderRef, Location, SpecialFolderKey } from '../lib/models/entry'
import { folderChain } from '../lib/models/entry'
import type { SortKey } from '../lib/models/sort'
import {
  currentLocation,
  explorerReducer,
  initialState,
  type ExplorerState,
} from './explorerReducer'

/** `user`: ניווט יזום של המשתמש (מנקה חיפוש). `result`: מעבר מתוצאה או התחלת חיפוש (לא מנקה). */
export type NavigationOrigin = 'user' | 'result'

export interface GoToOptions {
  origin?: NavigationOrigin
  /** מחליף את הרשומה הנוכחית בהיסטוריה וחותך forward. */
  replace?: boolean
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

interface ExplorerContextValue {
  state: ExplorerState
  location: Location
  actions: ExplorerActions
  adapter: FileSystemAdapter
  supported: boolean
  /** ה-SearchProvider רושם כאן ניקוי חיפוש שרץ בכל ניווט מסוג `user`. */
  userNavigationHook: MutableRefObject<(() => void) | null>
}

const ExplorerContext = createContext<ExplorerContextValue | null>(null)

function describeError(error: unknown): string {
  return error instanceof FsError ? error.message : 'אירעה שגיאה בלתי צפויה.'
}

export function ExplorerProvider({
  adapter,
  children,
}: {
  adapter: FileSystemAdapter
  children: ReactNode
}) {
  const [state, dispatch] = useReducer(explorerReducer, initialState)
  const location = currentLocation(state)
  const requestRef = useRef(0)
  const stateRef = useRef(state)
  const userNavigationHook = useRef<(() => void) | null>(null)
  useEffect(() => {
    stateRef.current = state
  })

  // טעינת תוכן התיקייה הנוכחית (רמה אחת בלבד). תשובות ישנות מתעלמים מהן.
  useEffect(() => {
    const request = ++requestRef.current
    if (location.type !== 'folder') return
    adapter.listEntries(location.folder).then(
      (entries) => {
        if (request === requestRef.current) dispatch({ type: 'loaded', entries })
      },
      (error: unknown) => {
        if (request === requestRef.current) {
          dispatch({ type: 'loadFailed', message: describeError(error) })
        }
      },
    )
  }, [adapter, location, state.refreshCount])

  const loadChildren = useCallback(
    async (folder: FolderRef) => {
      try {
        const children = await adapter.listSubfolders(folder)
        dispatch({ type: 'childrenLoaded', id: folder.id, children })
      } catch (error) {
        dispatch({ type: 'childrenFailed', id: folder.id, message: describeError(error) })
      }
    },
    [adapter],
  )

  // בעת ניווט לתיקייה: פותחים את כל האבות בעץ וטוענים את ילדיהם לפי הצורך.
  useEffect(() => {
    if (location.type !== 'folder') return
    const ancestors = folderChain(location.folder).slice(0, -1)
    if (ancestors.length === 0) return
    dispatch({ type: 'expand', ids: ancestors.map((a) => a.id) })
    for (const ancestor of ancestors) {
      if (!stateRef.current.children[ancestor.id]) void loadChildren(ancestor)
    }
  }, [location, loadChildren])

  const goTo = useCallback((next: Location, options: GoToOptions = {}) => {
    if ((options.origin ?? 'user') === 'user') userNavigationHook.current?.()
    dispatch({ type: 'navigate', location: next, replace: options.replace })
  }, [])
  const navigate = useCallback((next: Location) => goTo(next), [goTo])

  const actions = useMemo<ExplorerActions>(
    () => ({
      pickFolder: async (special) => {
        try {
          const folder = await adapter.pickFolder(special)
          if (!folder) return
          dispatch({ type: 'picked', folder, special })
          goTo({ type: 'folder', folder })
        } catch (error) {
          dispatch({ type: 'notice', message: describeError(error) })
        }
      },
      goTo,
      navigate,
      openFolder: (folder) => navigate({ type: 'folder', folder }),
      back: () => dispatch({ type: 'back' }),
      forward: () => dispatch({ type: 'forward' }),
      up: () => {
        const current = currentLocation(stateRef.current)
        // ממסך תוצאות "למעלה" יוצא מהחיפוש אל תיקיית ה-root שלו.
        if (current.type === 'search') return navigate({ type: 'folder', folder: current.root })
        if (current.type !== 'folder') return
        navigate(current.folder.parent ? { type: 'folder', folder: current.folder.parent } : { type: 'home' })
      },
      refresh: () => {
        const current = stateRef.current
        const here = currentLocation(current)
        userNavigationHook.current?.()
        dispatch({ type: 'refresh' })
        if (here.type === 'folder' && current.expanded[here.folder.id]) void loadChildren(here.folder)
      },
      select: (id, ctrl, shift, orderedIds) =>
        dispatch({ type: 'click', id, ctrl, shift, orderedIds }),
      clearSelection: () => dispatch({ type: 'clearSelection' }),
      sortBy: (key) => dispatch({ type: 'sort', key }),
      toggleTypeFilter: (label) => dispatch({ type: 'toggleTypeFilter', label }),
      clearTypeFilter: () => dispatch({ type: 'clearTypeFilter' }),
      toggleNode: (folder) => {
        const current = stateRef.current
        dispatch({ type: 'toggleExpand', id: folder.id })
        if (!current.expanded[folder.id] && !current.children[folder.id]) void loadChildren(folder)
      },
      dismissNotice: () => dispatch({ type: 'notice', message: null }),
    }),
    [adapter, goTo, navigate, loadChildren],
  )

  const value = useMemo(
    () => ({
      state,
      location,
      actions,
      adapter,
      supported: adapter.isSupported(),
      userNavigationHook,
    }),
    [state, location, actions, adapter],
  )

  return <ExplorerContext.Provider value={value}>{children}</ExplorerContext.Provider>
}

export function useExplorer(): ExplorerContextValue {
  const value = useContext(ExplorerContext)
  if (!value) throw new Error('useExplorer must be used inside ExplorerProvider')
  return value
}
