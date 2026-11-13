import { createContext, useContext } from 'react'
import type { FileSystemEntry } from '../lib/models/entry'
import type { SearchSession } from './searchReducer'

export interface SearchActions {
  /** מתחיל חיפוש מהמיקום הנוכחי (`folder`, או `search` להחלפה). במקומות אחרים לא עושה דבר. */
  start: (pattern: string) => void
  /** כמו `start` אחרי `SEARCH_DEBOUNCE_MS` ללא קריאה נוספת; קריאה חדשה מאפסת את הטיימר. */
  schedule: (pattern: string) => void
  /** מבטל התחלת חיפוש ממתינה (למשל כשהתיבה התרוקנה). */
  cancelScheduled: () => void
  /** האם מחכה התחלת חיפוש (המשתמש באמצע הקלדה). */
  isScheduled: () => boolean
  /** משהה: לא נקרא `next()` נוסף, והתוצאות שנמצאו נשמרות. רק מ-`scanning`. */
  pause: () => void
  /** ממשיך מאותה נקודה בלי סריקה מחדש. רק מ-`paused`. */
  resume: () => void
  /** עוצר סופית (גם מהשהיה); התוצאות שנמצאו נשמרות. */
  stop: () => void
  /** ממיין לפי קרבה (תצוגה נגזרת); לא זמין בזמן `scanning`. */
  sortByScore: () => void
}

/** גודל ותאריך נטענים רק לתוצאות שמוצגות (הסריקה עצמה לא קוראת קבצים). */
export type EntryDetails = Pick<FileSystemEntry, 'size' | 'modified' | 'mimeType' | 'unreadable'>

export interface SearchContextValue {
  session: SearchSession | null
  /** פרטים שנטענו לתוצאות הסשן הנוכחי, לפי מזהה פריט. */
  details: Record<string, EntryDetails>
  actions: SearchActions
  /** טוען פעם אחת גודל ותאריך של תוצאה (קובץ בלבד). */
  requestDetails: (entry: FileSystemEntry) => void
}

export const SearchContext = createContext<SearchContextValue | null>(null)

/** כמו `useSearch`, אך מחזיר null מחוץ ל-SearchProvider (רכיבים משותפים כמו StatusBar). */
export function useSearchOptional(): SearchContextValue | null {
  return useContext(SearchContext)
}

export function useSearch(): SearchContextValue {
  const value = useContext(SearchContext)
  if (!value) throw new Error('useSearch must be used inside SearchProvider')
  return value
}
