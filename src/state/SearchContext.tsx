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
import { normalizePattern, type FolderRef } from '../lib/models/entry'
import { scanTree } from '../lib/scanTree'
import { compilePattern } from '../lib/utils/pattern'
import { useExplorer } from './ExplorerContext'
import { searchReducer, type SearchSession } from './searchReducer'

export interface SearchActions {
  /** מתחיל חיפוש מהמיקום הנוכחי (`folder`, או `search` להחלפה). במקומות אחרים לא עושה דבר. */
  start: (pattern: string) => void
  /** עוצר סופית; התוצאות שנמצאו נשמרות. */
  stop: () => void
}

interface SearchContextValue {
  session: SearchSession | null
  actions: SearchActions
}

const SearchContext = createContext<SearchContextValue | null>(null)

/**
 * מחזיק את סשן החיפוש ואת הסריקה שלו. הסריקה מופעלת מאפקט יחיד: כשהמיקום הוא `search`
 * והסשן מתאים לו ועדיין לא הופעלה עבורו ריצה.
 */
export function SearchProvider({ children }: { children: ReactNode }) {
  const { adapter, location, actions: explorer, userNavigationHook } = useExplorer()
  const [session, dispatch] = useReducer(searchReducer, null)

  const runIdRef = useRef(0)
  const launchedRunRef = useRef<number | null>(null)
  const controllerRef = useRef<AbortController | null>(null)
  const locationRef = useRef(location)
  useEffect(() => {
    locationRef.current = location
  })

  const abortRun = useCallback(() => {
    controllerRef.current?.abort()
    controllerRef.current = null
  }, [])

  // ניווט יזום של המשתמש: ניקוי הסשן וביטול הריצה באותו אירוע (React מאחד לרינדור אחד).
  useEffect(() => {
    userNavigationHook.current = () => {
      abortRun()
      launchedRunRef.current = null
      dispatch({ type: 'clear' })
    }
    return () => {
      userNavigationHook.current = null
    }
  }, [userNavigationHook, abortRun])

  // בעת הסרה (כולל סימולציית StrictMode) מבטלים ריצה פעילה ומאפשרים הפעלה מחדש.
  useEffect(
    () => () => {
      abortRun()
      launchedRunRef.current = null
    },
    [abortRun],
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

  const stop = useCallback(() => {
    abortRun()
    if (runIdRef.current) dispatch({ type: 'stop', runId: runIdRef.current })
  }, [abortRun])

  const runSearch = useCallback(
    async (runId: number, root: FolderRef, pattern: string) => {
      const controller = new AbortController()
      controllerRef.current = controller
      const scan = scanTree(adapter, root, compilePattern(pattern), controller.signal)
      try {
        for await (const result of scan) {
          if (controller.signal.aborted) break
          dispatch({ type: 'result', runId, result })
        }
      } catch {
        // כשל בלתי צפוי בסריקה מסיים אותה עם מה שנמצא.
      }
      if (!controller.signal.aborted) dispatch({ type: 'finished', runId })
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

  const value = useMemo(() => ({ session, actions: { start, stop } }), [session, start, stop])
  return <SearchContext.Provider value={value}>{children}</SearchContext.Provider>
}

export function useSearch(): SearchContextValue {
  const value = useContext(SearchContext)
  if (!value) throw new Error('useSearch must be used inside SearchProvider')
  return value
}
