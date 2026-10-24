import {
  sameLocation,
  type FileSystemEntry,
  type FolderRef,
  type Location,
  type SpecialFolderKey,
} from '../lib/models/entry'
import type { SortKey, SortState } from '../lib/models/sort'
import { matchesName } from '../lib/utils/nameSearch'

export type LoadStatus = 'idle' | 'loading' | 'error'

export interface ExplorerState {
  roots: FolderRef[]
  specials: Partial<Record<SpecialFolderKey, FolderRef>>
  history: Location[]
  index: number
  entries: FileSystemEntry[]
  status: LoadStatus
  error: string | null
  /** הודעה כללית (למשל כשל בבחירת תיקייה). */
  notice: string | null
  selection: string[]
  anchor: string | null
  sort: SortState
  /** תוויות סוג נבחרות לסינון; ריק = ללא סינון. */
  typeFilter: string[]
  /** מחרוזת החיפוש לפי שם בתיקייה הנוכחית; ריק = ללא סינון. */
  searchQuery: string
  expanded: Record<string, boolean>
  children: Record<string, FolderRef[]>
  treeErrors: Record<string, string>
  refreshCount: number
}

export const initialState: ExplorerState = {
  roots: [],
  specials: {},
  history: [{ type: 'home' }],
  index: 0,
  entries: [],
  status: 'idle',
  error: null,
  notice: null,
  selection: [],
  anchor: null,
  sort: { key: 'name', direction: 'asc' },
  typeFilter: [],
  searchQuery: '',
  expanded: {},
  children: {},
  treeErrors: {},
  refreshCount: 0,
}

export type ExplorerAction =
  | { type: 'picked'; folder: FolderRef; special?: SpecialFolderKey }
  /** `replace`: מחליף את הרשומה הנוכחית (וחותך forward) במקום להוסיף רשומה. */
  | { type: 'navigate'; location: Location; replace?: boolean }
  | { type: 'back' }
  | { type: 'forward' }
  | { type: 'refresh' }
  | { type: 'loaded'; entries: FileSystemEntry[] }
  | { type: 'loadFailed'; message: string }
  | { type: 'notice'; message: string | null }
  | { type: 'click'; id: string; ctrl: boolean; shift: boolean; orderedIds: string[] }
  | { type: 'clearSelection' }
  | { type: 'sort'; key: SortKey }
  | { type: 'toggleTypeFilter'; label: string }
  | { type: 'clearTypeFilter' }
  | { type: 'search'; query: string }
  | { type: 'expand'; ids: string[] }
  | { type: 'toggleExpand'; id: string }
  | { type: 'childrenLoaded'; id: string; children: FolderRef[] }
  | { type: 'childrenFailed'; id: string; message: string }

export function currentLocation(state: ExplorerState): Location {
  return state.history[state.index]
}

/** מצב טעינה/איפוס עבור המיקום שאליו עוברים. */
function enter(state: ExplorerState, index: number): ExplorerState {
  const isFolder = state.history[index].type === 'folder'
  return {
    ...state,
    index,
    entries: [],
    selection: [],
    anchor: null,
    typeFilter: [],
    searchQuery: '',
    error: null,
    status: isFolder ? 'loading' : 'idle',
  }
}

function applyClick(
  state: ExplorerState,
  action: Extract<ExplorerAction, { type: 'click' }>,
): ExplorerState {
  const { id, ctrl, shift, orderedIds } = action
  if (shift && state.anchor && orderedIds.includes(state.anchor)) {
    const from = orderedIds.indexOf(state.anchor)
    const to = orderedIds.indexOf(id)
    const [start, end] = from <= to ? [from, to] : [to, from]
    return { ...state, selection: orderedIds.slice(start, end + 1) }
  }
  if (ctrl) {
    const selected = state.selection.includes(id)
    return {
      ...state,
      selection: selected ? state.selection.filter((s) => s !== id) : [...state.selection, id],
      anchor: id,
    }
  }
  return { ...state, selection: [id], anchor: id }
}

export function explorerReducer(state: ExplorerState, action: ExplorerAction): ExplorerState {
  switch (action.type) {
    case 'picked': {
      const { folder, special } = action
      return {
        ...state,
        roots: state.roots.some((r) => r.id === folder.id) ? state.roots : [...state.roots, folder],
        specials: special ? { ...state.specials, [special]: folder } : state.specials,
        notice: null,
      }
    }
    case 'navigate': {
      if (sameLocation(currentLocation(state), action.location)) return state
      const keep = action.replace ? state.index : state.index + 1
      const history = [...state.history.slice(0, keep), action.location]
      return enter({ ...state, history }, history.length - 1)
    }
    case 'back':
      return state.index > 0 ? enter(state, state.index - 1) : state
    case 'forward':
      return state.index < state.history.length - 1 ? enter(state, state.index + 1) : state
    case 'refresh': {
      const entered = enter(state, state.index)
      const location = currentLocation(state)
      if (location.type !== 'folder') return entered
      const { [location.folder.id]: _dropped, ...children } = state.children
      return { ...entered, children, refreshCount: state.refreshCount + 1 }
    }
    case 'loaded':
      return { ...state, entries: action.entries, status: 'idle', error: null }
    case 'loadFailed':
      return { ...state, entries: [], status: 'error', error: action.message }
    case 'notice':
      return { ...state, notice: action.message }
    case 'click':
      return applyClick(state, action)
    case 'clearSelection':
      return state.selection.length ? { ...state, selection: [], anchor: null } : state
    case 'sort':
      return {
        ...state,
        sort:
          state.sort.key === action.key
            ? { key: action.key, direction: state.sort.direction === 'asc' ? 'desc' : 'asc' }
            : { key: action.key, direction: 'asc' },
      }
    case 'toggleTypeFilter':
      return {
        ...state,
        typeFilter: state.typeFilter.includes(action.label)
          ? state.typeFilter.filter((l) => l !== action.label)
          : [...state.typeFilter, action.label],
      }
    case 'clearTypeFilter':
      return state.typeFilter.length ? { ...state, typeFilter: [] } : state
    case 'search': {
      // פריטים נבחרים שאינם מופיעים עוד בתוצאות החיפוש יוצאים מהבחירה.
      const visible = new Set(state.entries.filter((e) => matchesName(e, action.query)).map((e) => e.id))
      const selection = state.selection.filter((id) => visible.has(id))
      return {
        ...state,
        searchQuery: action.query,
        selection: selection.length === state.selection.length ? state.selection : selection,
        anchor: state.anchor && visible.has(state.anchor) ? state.anchor : null,
      }
    }
    case 'expand': {
      const expanded = { ...state.expanded }
      for (const id of action.ids) expanded[id] = true
      return { ...state, expanded }
    }
    case 'toggleExpand':
      return { ...state, expanded: { ...state.expanded, [action.id]: !state.expanded[action.id] } }
    case 'childrenLoaded': {
      const { [action.id]: _cleared, ...treeErrors } = state.treeErrors
      return { ...state, children: { ...state.children, [action.id]: action.children }, treeErrors }
    }
    case 'childrenFailed':
      return {
        ...state,
        children: { ...state.children, [action.id]: [] },
        treeErrors: { ...state.treeErrors, [action.id]: action.message },
      }
  }
}
