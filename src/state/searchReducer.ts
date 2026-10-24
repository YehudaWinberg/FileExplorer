import type { FolderRef } from '../lib/models/entry'
import type { SearchResult } from '../lib/scanTree'

/**
 * idle אינו סטטוס של סשן (אין סשן). מעברים: scanning <-> paused; scanning/paused -> stopped;
 * scanning/paused -> done. מ-stopped ו-done אין חזרה; רק `start` חדש.
 */
/** תקרת התוצאות (נאכפת בצרכן ב-2.3); משמשת כאן לחישוב רוחב פס ההתקדמות. */
export const RESULT_CAP = 500

export type SearchStatus = 'scanning' | 'paused' | 'done' | 'stopped'

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
  | { type: 'pause'; runId: number }
  | { type: 'resume'; runId: number }
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
      // תוצאה שכבר בדרך ברגע ההשהיה נשמרת; תוצאה שחזרה אחרי עצירה או סיום נזרקת.
      if (state.status !== 'scanning' && state.status !== 'paused') return state
      return { ...state, results: [...state.results, action.result], count: state.count + 1 }
    }
    case 'finished':
      return state.status === 'scanning' || state.status === 'paused' ? { ...state, status: 'done' } : state
    case 'pause':
      return state.status === 'scanning' ? { ...state, status: 'paused' } : state
    case 'resume':
      return state.status === 'paused' ? { ...state, status: 'scanning' } : state
    case 'stop':
      return state.status === 'scanning' || state.status === 'paused' ? { ...state, status: 'stopped' } : state
  }
}
