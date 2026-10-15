import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
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

export interface ExplorerActions {
  pickFolder: (special?: SpecialFolderKey) => Promise<void>
  navigate: (location: Location) => void
  openFolder: (folder: FolderRef) => void
  back: () => void
  forward: () => void
  up: () => void
  refresh: () => void
  select: (id: string, ctrl: boolean, shift: boolean, orderedIds: string[]) => void
  clearSelection: () => void
  sortBy: (key: SortKey) => void
  toggleNode: (folder: FolderRef) => void
  dismissNotice: () => void
}

interface ExplorerContextValue {
  state: ExplorerState
  location: Location
  actions: ExplorerActions
  adapter: FileSystemAdapter
  supported: boolean
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

  const navigate = useCallback((next: Location) => dispatch({ type: 'navigate', location: next }), [])

  const actions = useMemo<ExplorerActions>(
    () => ({
      pickFolder: async (special) => {
        try {
          const folder = await adapter.pickFolder(special)
          if (!folder) return
          dispatch({ type: 'picked', folder, special })
          dispatch({ type: 'navigate', location: { type: 'folder', folder } })
        } catch (error) {
          dispatch({ type: 'notice', message: describeError(error) })
        }
      },
      navigate,
      openFolder: (folder) => navigate({ type: 'folder', folder }),
      back: () => dispatch({ type: 'back' }),
      forward: () => dispatch({ type: 'forward' }),
      up: () => {
        const current = currentLocation(stateRef.current)
        if (current.type !== 'folder') return
        navigate(current.folder.parent ? { type: 'folder', folder: current.folder.parent } : { type: 'home' })
      },
      refresh: () => {
        const current = stateRef.current
        const here = currentLocation(current)
        dispatch({ type: 'refresh' })
        if (here.type === 'folder' && current.expanded[here.folder.id]) void loadChildren(here.folder)
      },
      select: (id, ctrl, shift, orderedIds) =>
        dispatch({ type: 'click', id, ctrl, shift, orderedIds }),
      clearSelection: () => dispatch({ type: 'clearSelection' }),
      sortBy: (key) => dispatch({ type: 'sort', key }),
      toggleNode: (folder) => {
        const current = stateRef.current
        dispatch({ type: 'toggleExpand', id: folder.id })
        if (!current.expanded[folder.id] && !current.children[folder.id]) void loadChildren(folder)
      },
      dismissNotice: () => dispatch({ type: 'notice', message: null }),
    }),
    [adapter, navigate, loadChildren],
  )

  const value = useMemo(
    () => ({
      state,
      location,
      actions,
      adapter,
      supported: adapter.isSupported(),
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
