import type { FolderRef } from '../lib/models/entry'
import type { SearchResult } from '../lib/scanTree'

export type SearchStatus = 'scanning' | 'done' | 'stopped'

/** הבעלים היחיד של הדפוס ושל תוצאות החיפוש; סשן אחד (האחרון) בכל רגע. */
export interface SearchSession {
  runId: number
  root: FolderRef
  pattern: string
  status: SearchStatus
  /** בסדר ההגעה, בלי מיון. */
  results: SearchResult[]
  count: number
  sortedByScore: boolean
}

export type SearchState = SearchSession | null

/** כל action של סריקה נושא `runId`; action עם `runId` שונה מזה שבסשן מתעלמים ממנו. */
export type SearchAction =
  | { type: 'start'; runId: number; root: FolderRef; pattern: string }
  | { type: 'result'; runId: number; result: SearchResult }
  | { type: 'finished'; runId: number }
  | { type: 'stop'; runId: number }
  | { type: 'clear' }

export function searchReducer(state: SearchState, action: SearchAction): SearchState {
  if (action.type === 'start') {
    const { runId, root, pattern } = action
    return { runId, root, pattern, status: 'scanning', results: [], count: 0, sortedByScore: false }
  }
  if (action.type === 'clear') return null
  if (!state || state.runId !== action.runId) return state
  switch (action.type) {
    case 'result': {
      // תוצאה שחזרה אחרי עצירה (או אחרי סיום) נזרקת.
      if (state.status !== 'scanning') return state
      return { ...state, results: [...state.results, action.result], count: state.count + 1 }
    }
    case 'finished':
      return state.status === 'scanning' ? { ...state, status: 'done' } : state
    case 'stop':
      return state.status === 'scanning' ? { ...state, status: 'stopped' } : state
  }
}
