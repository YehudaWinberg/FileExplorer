import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { normalizePattern, type FileSystemEntry, type FolderRef } from '../lib/models/entry'
import { scanTree } from '../lib/scanTree'
import { compilePattern } from '../lib/utils/pattern'
import { useExplorer } from './ExplorerContext'
import { RESULT_CAP, searchReducer, type SearchSession } from './searchReducer'

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

export const SEARCH_DEBOUNCE_MS = 300

/** גודל ותאריך נטענים רק לתוצאות שמוצגות (הסריקה עצמה לא קוראת קבצים). */
export type EntryDetails = Pick<FileSystemEntry, 'size' | 'modified' | 'mimeType' | 'unreadable'>

interface SearchContextValue {
  session: SearchSession | null
  /** פרטים שנטענו לתוצאות הסשן הנוכחי, לפי מזהה פריט. */
  details: Record<string, EntryDetails>
  actions: SearchActions
  /** טוען פעם אחת גודל ותאריך של תוצאה (קובץ בלבד). */
  requestDetails: (entry: FileSystemEntry) => void
}

const SearchContext = createContext<SearchContextValue | null>(null)
const NO_DETAILS: Record<string, EntryDetails> = {}

/**
 * מחזיק את סשן החיפוש ואת הסריקה שלו. הסריקה מופעלת מאפקט יחיד: כשהמיקום הוא `search`
 * והסשן מתאים לו ועדיין לא הופעלה עבורו ריצה.
 */
export function SearchProvider({ children }: { children: ReactNode }) {
  const { adapter, location, actions: explorer, userNavigationHook } = useExplorer()
  const [session, dispatch] = useReducer(searchReducer, null)
  const [loaded, setLoaded] = useState<{ runId: number; byId: Record<string, EntryDetails> }>({ runId: 0, byId: {} })
  const requestedRef = useRef<{ runId: number; ids: Set<string> }>({ runId: 0, ids: new Set() })

  const runIdRef = useRef(0)
  const launchedRunRef = useRef<number | null>(null)
  const controllerRef = useRef<AbortController | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pausedRef = useRef(false)
  const resumeGateRef = useRef<(() => void) | null>(null)
  const sessionRef = useRef(session)
  useEffect(() => {
    sessionRef.current = session
  })
  const locationRef = useRef(location)
  useEffect(() => {
    locationRef.current = location
  })

  const cancelScheduled = useCallback(() => {
    if (timerRef.current !== null) clearTimeout(timerRef.current)
    timerRef.current = null
  }, [])

  const isScheduled = useCallback(() => timerRef.current !== null, [])

  /** משחרר את לולאת הסריקה אם היא ממתינה להמשך. */
  const openResumeGate = useCallback(() => {
    resumeGateRef.current?.()
    resumeGateRef.current = null
  }, [])

  const abortRun = useCallback(() => {
    controllerRef.current?.abort()
    controllerRef.current = null
    pausedRef.current = false
    openResumeGate()
  }, [openResumeGate])

  // ניווט יזום של המשתמש: ניקוי הסשן וביטול הריצה באותו אירוע (React מאחד לרינדור אחד).
  useEffect(() => {
    userNavigationHook.current = () => {
      cancelScheduled()
      abortRun()
      launchedRunRef.current = null
      dispatch({ type: 'clear' })
    }
    return () => {
      userNavigationHook.current = null
    }
  }, [userNavigationHook, abortRun, cancelScheduled])

  // בעת הסרה (כולל סימולציית StrictMode) מבטלים ריצה פעילה ומאפשרים הפעלה מחדש.
  useEffect(
    () => () => {
      cancelScheduled()
      abortRun()
      launchedRunRef.current = null
    },
    [abortRun, cancelScheduled],
  )

  const begin = useCallback(
    (root: FolderRef, pattern: string): number => {
      abortRun()
      const runId = ++runIdRef.current
      launchedRunRef.current = null
      dispatch({ type: 'start', runId, root, pattern })
      return runId
    },
    [abortRun],
  )

  const start = useCallback(
    (pattern: string) => {
      const here = locationRef.current
      const trimmed = pattern.trim()
      if (!trimmed || (here.type !== 'folder' && here.type !== 'search')) return
      const root = here.type === 'folder' ? here.folder : here.root
      begin(root, trimmed)
      explorer.goTo(
        { type: 'search', root, pattern: trimmed },
        { origin: 'result', replace: here.type === 'search' },
      )
    },
    [begin, explorer],
  )

  const schedule = useCallback(
    (pattern: string) => {
      cancelScheduled()
      timerRef.current = setTimeout(() => {
        timerRef.current = null
        start(pattern)
      }, SEARCH_DEBOUNCE_MS)
    },
    [cancelScheduled, start],
  )

  const pause = useCallback(() => {
    if (sessionRef.current?.status !== 'scanning') return
    pausedRef.current = true
    dispatch({ type: 'pause', runId: sessionRef.current.runId })
  }, [])

  const resume = useCallback(() => {
    if (sessionRef.current?.status !== 'paused') return
    pausedRef.current = false
    dispatch({ type: 'resume', runId: sessionRef.current.runId })
    openResumeGate()
  }, [openResumeGate])

  const sortByScore = useCallback(() => {
    if (sessionRef.current) dispatch({ type: 'sortByScore', runId: sessionRef.current.runId })
  }, [])

  const stop = useCallback(() => {
    cancelScheduled()
    abortRun()
    if (runIdRef.current) dispatch({ type: 'stop', runId: runIdRef.current })
  }, [abortRun, cancelScheduled])

  const runSearch = useCallback(
    async (runId: number, root: FolderRef, pattern: string) => {
      const controller = new AbortController()
      controllerRef.current = controller
      const scan = scanTree(adapter, root, compilePattern(pattern), controller.signal)
      let received = 0
      let capped = false
      try {
        while (!controller.signal.aborted) {
          // בהשהיה לא קוראים ל-next(); תוצאה שכבר בדרך (next() שהתחיל) נשמרת בלולאה למטה.
          if (pausedRef.current) {
            await new Promise<void>((resolve) => (resumeGateRef.current = resolve))
            continue
          }
          const step = await scan.next()
          if (step.done || controller.signal.aborted) break
          dispatch({ type: 'result', runId, result: step.value })
          received += 1
          if (received >= RESULT_CAP) {
            // התקרה נאכפת כאן, בצרכן: עוצרים את המחולל ומסמנים `capped`.
            capped = true
            dispatch({ type: 'cap', runId })
            break
          }
        }
      } catch {
        // כשל בלתי צפוי בסריקה מסיים אותה עם מה שנמצא.
      } finally {
        // סגירת המחולל מתבצעת רק כשאין next() פעיל (הקריאות רצות ברצף).
        await scan.return(undefined).catch(() => undefined)
        if (controllerRef.current === controller) pausedRef.current = false
      }
      if (!controller.signal.aborted && !capped) dispatch({ type: 'finished', runId })
    },
    [adapter],
  )

  // האפקט היחיד שמפעיל סריקה (מוגן מהפעלה כפולה גם ב-StrictMode).
  useEffect(() => {
    if (location.type !== 'search') return
    if (
      !session ||
      session.root.id !== location.root.id ||
      normalizePattern(session.pattern) !== normalizePattern(location.pattern)
    ) {
      // ניווט אחורה/קדימה לחיפוש שהסשן שלו נוקה: מתחילים סשן חדש לאותו דפוס.
      begin(location.root, location.pattern)
      return
    }
    if (session.status !== 'scanning' || launchedRunRef.current === session.runId) return
    launchedRunRef.current = session.runId
    void runSearch(session.runId, session.root, session.pattern)
  }, [location, session, begin, runSearch])

  // יציאה מ-`search` (back/forward) בזמן סריקה משהה אותה ושומרת את הסשן (AD-3).
  // ניווט `user` כבר ניקה את הסשן, ולכן כאן אין מה להשהות.
  const previousTypeRef = useRef(location.type)
  useEffect(() => {
    const left = previousTypeRef.current === 'search' && location.type !== 'search'
    previousTypeRef.current = location.type
    if (left) pause()
  }, [location.type, pause])

  const requestDetails = useCallback(
    (entry: FileSystemEntry) => {
      const runId = runIdRef.current
      if (requestedRef.current.runId !== runId) requestedRef.current = { runId, ids: new Set() }
      if (entry.kind !== 'file' || requestedRef.current.ids.has(entry.id)) return
      requestedRef.current.ids.add(entry.id)
      const store = (extra: EntryDetails) => {
        // תשובה שהגיעה אחרי שהחיפוש הוחלף או נוקה נזרקת.
        if (runIdRef.current !== runId) return
        setLoaded((prev) => ({
          runId,
          byId: { ...(prev.runId === runId ? prev.byId : {}), [entry.id]: extra },
        }))
      }
      adapter.getFile(entry).then(
        (file) => store({ size: file.size, modified: file.lastModified, mimeType: file.type || undefined }),
        () => store({ unreadable: true }),
      )
    },
    [adapter],
  )

  const details = session && loaded.runId === session.runId ? loaded.byId : NO_DETAILS
  const value = useMemo(
    () => ({ session, details, actions: { start, schedule, cancelScheduled, isScheduled, pause, resume, stop, sortByScore }, requestDetails }),
    [session, details, start, schedule, cancelScheduled, isScheduled, pause, resume, stop, sortByScore, requestDetails],
  )
  return <SearchContext.Provider value={value}>{children}</SearchContext.Provider>
}

/** כמו `useSearch`, אך מחזיר null מחוץ ל-SearchProvider (רכיבים משותפים כמו StatusBar). */
export function useSearchOptional(): SearchContextValue | null {
  return useContext(SearchContext)
}

export function useSearch(): SearchContextValue {
  const value = useContext(SearchContext)
  if (!value) throw new Error('useSearch must be used inside SearchProvider')
  return value
}
