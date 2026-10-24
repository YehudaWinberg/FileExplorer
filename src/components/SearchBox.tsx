import { useEffect, useState } from 'react'
import { normalizePattern } from '../lib/models/entry'
import { useExplorer } from '../state/ExplorerContext'
import { useSearch } from '../state/SearchContext'
import { SearchIcon, StopIcon } from './icons'

const LABEL = 'חיפוש בתיקייה הנוכחית ובתיקיות שבתוכה'
const STOP_LABEL = 'עצירה'

/**
 * תיבת החיפוש בשורת הכתובת. הטקסט הוא טיוטה מקומית בלבד; הדפוס שורד ב-`SearchSession`.
 * אחרי הקלדה נקראת `search.schedule` (debounce) ואין סינון מיידי של התיקייה.
 */
export function SearchBox({ onFocusChange }: { onFocusChange?: (focused: boolean) => void }) {
  const { location, actions: explorer } = useExplorer()
  const goTo = explorer.goTo
  const { session, actions } = useSearch()
  const [draft, setDraft] = useState('')
  const [focused, setFocused] = useState(false)
  const enabled = location.type === 'folder' || location.type === 'search'
  const scanning = location.type === 'search' && session?.status === 'scanning'

  // מיקום חדש (ניווט, back/forward): התיבה משקפת את הדפוס של החיפוש, או מתרוקנת מחוץ לחיפוש.
  const locationPattern = location.type === 'search' ? location.pattern : ''
  useEffect(() => {
    // המשתמש באמצע הקלדה (יש התחלת חיפוש ממתינה): לא דורסים את הטיוטה.
    if (actions.isScheduled()) return
    setDraft((current) => (normalizePattern(current) === normalizePattern(locationPattern) ? current : locationPattern))
  }, [location, locationPattern, actions])

  const change = (value: string) => {
    setDraft(value)
    if (value.trim() !== '') return actions.schedule(value)
    actions.cancelScheduled()
    // ניקוי התיבה ממסך תוצאות חוזר לתיקיית ה-root של החיפוש (ניווט יזום: מנקה את הסשן).
    if (location.type === 'search') goTo({ type: 'folder', folder: location.root })
  }
  const focus = (value: boolean) => {
    setFocused(value)
    onFocusChange?.(value)
  }

  // הכרזה לקורא מסך רק על מעברי מצב, לא על כל תוצאה (המונה החזותי מוסתר ממנו).
  const announcement =
    location.type !== 'search' || !session
      ? ''
      : session.status === 'scanning'
        ? 'סורק'
        : `הסריקה ${session.status === 'done' ? 'הסתיימה' : 'נעצרה'}, נמצאו ${session.count} תוצאות`

  return (
    <div className={`search-box${focused ? ' search-box--focus' : ''}`} data-disabled={!enabled}>
      <SearchIcon size={14} className="search-box__icon" />
      <input
        type="search"
        className="search-box__input"
        placeholder="חיפוש"
        aria-label={LABEL}
        title={LABEL}
        disabled={!enabled}
        value={draft}
        onChange={(event) => change(event.target.value)}
        onFocus={() => focus(true)}
        onBlur={() => focus(false)}
      />
      {scanning && session && (
        <>
          <span className="search-box__status tabular" aria-hidden="true">
            סורק… נמצאו {session.count}
          </span>
          <button
            type="button"
            className="search-box__control"
            aria-label={STOP_LABEL}
            title={STOP_LABEL}
            onClick={actions.stop}
          >
            <StopIcon />
          </button>
        </>
      )}
      <span className="visually-hidden" role="status" aria-live="polite">
        {announcement}
      </span>
    </div>
  )
}
