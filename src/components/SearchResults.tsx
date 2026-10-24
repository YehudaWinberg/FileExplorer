import { useEffect, useMemo, type MouseEvent } from 'react'
import type { FileSystemEntry, FolderRef } from '../lib/models/entry'
import { getFileKind } from '../lib/utils/fileTypes'
import { formatDate, formatSize } from '../lib/utils/format'
import { formatResultPath } from '../lib/utils/resultPath'
import { useExplorer } from '../state/ExplorerContext'
import { useSearch } from '../state/SearchContext'
import { CAPPED_MESSAGE, STOPPED_MESSAGE } from '../state/searchReducer'
import { useVisibleEntries } from '../state/selectors'
import { EmptyState } from './EmptyState'
import { FileKindIcon, SortArrowIcon } from './icons'
import { ProximityRing } from './ProximityRing'

function ResultRow({ entry, parent, score, selected, isNew, onSelect, onVisible }: {
  entry: FileSystemEntry
  parent: FolderRef
  score: number
  selected: boolean
  isNew: boolean
  onSelect: (event: MouseEvent) => void
  onVisible: (entry: FileSystemEntry) => void
}) {
  // גודל ותאריך נטענים רק לשורה שמוצגת, לא לפריטים שנדחו.
  useEffect(() => {
    onVisible(entry)
  }, [entry, onVisible])
  const path = formatResultPath(parent)
  const modified = formatDate(entry.modified)
  return (
    <div
      role="row"
      aria-selected={selected}
      className={`result-row${selected ? ' result-row--selected' : ''}${isNew ? ' result-row--new' : ''}`}
      onClick={onSelect}
    >
      <div role="cell" className="result-name">
        <ProximityRing score={score}>
          <FileKindIcon kind={getFileKind(entry)} size={16} />
        </ProximityRing>
        <span className="result-name__text">
          <span className="ellipsis" title={entry.name}>{entry.name}</span>
          {modified && <span className="result-name__date">שונה ב-{modified}</span>}
        </span>
      </div>
      <div role="cell" className="result-path" title={path.full}>
        <bdi>{path.text}</bdi>
      </div>
      <div role="cell" className="result-size tabular">{entry.kind === 'file' ? formatSize(entry.size) : ''}</div>
    </div>
  )
}

const SORT_LABEL = 'מיון לפי קרבה'
const SORT_DISABLED_HINT = 'המיון יהיה זמין בסיום הסריקה'

/** כפתור המיון גלוי תמיד; מושבת בסריקה פעילה ובסשן ריק (UX-DR7). */
function SortBar() {
  const { session, actions } = useSearch()
  const scanning = session?.status === 'scanning'
  const disabled = !session || scanning || session.count === 0
  const active = session?.sortedByScore ?? false
  return (
    <div className="sort-bar">
      <button
        type="button"
        className={`sort-button${active ? ' sort-button--active' : ''}`}
        disabled={disabled}
        aria-pressed={active}
        title={scanning ? SORT_DISABLED_HINT : SORT_LABEL}
        onClick={actions.sortByScore}
      >
        <SortArrowIcon size={12} />
        <span>{SORT_LABEL}</span>
      </button>
    </div>
  )
}

/** מסך התוצאות: שלוש עמודות (שם ותאריך, נתיב, גודל); סדר ההגעה, או מיון לפי קרבה ביוזמת המשתמש. */
export function SearchResults() {
  const { state, actions, location } = useExplorer()
  const { session, requestDetails } = useSearch()
  const entries = useVisibleEntries()
  const selected = useMemo(() => new Set(state.selection), [state.selection])
  const orderedIds = useMemo(() => entries.map((e) => e.id), [entries])
  const resultById = useMemo(() => new Map((session?.results ?? []).map((r) => [r.entry.id, r])), [session?.results])

  if (location.type !== 'search') return null

  // `לא נמצאו תוצאות` שמורה ל-`done`; הפסקה ותקרה מקבלות הודעה משלהן.
  const notice =
    session?.status === 'capped' ? CAPPED_MESSAGE : session?.status === 'stopped' ? STOPPED_MESSAGE : null
  const empty = entries.length === 0

  return (
    <div className="file-view">
      <SortBar />
      {empty && session?.status === 'done' && (
        <EmptyState
          title="לא נמצאו תוצאות"
          detail={`אין קובץ שמתאים ל-"${session.pattern}" בתיקיית ${session.root.name} ובתיקיות שבתוכה.`}
        >
          <p className="empty__detail">נסו שם קצר יותר, למשל כהן*</p>
        </EmptyState>
      )}
      {empty && notice && <EmptyState title={notice} />}
      {!empty && notice && <p className="results-notice">{notice}</p>}
      {!empty && (
        <div className="file-view__scroll">
          <div className="results" role="table" aria-label="תוצאות החיפוש" onClick={actions.clearSelection}>
            <div role="row" className="result-row result-row--header" onClick={(e) => e.stopPropagation()}>
              <div role="columnheader">שם</div>
              <div role="columnheader">נתיב</div>
              <div role="columnheader" className="result-size">גודל</div>
            </div>
            {entries.map((entry) => (
              <ResultRow
                key={entry.id}
                entry={entry}
                parent={resultById.get(entry.id)!.parent}
                score={resultById.get(entry.id)!.score}
                selected={selected.has(entry.id)}
                isNew={session?.status === 'scanning'}
                onVisible={requestDetails}
                onSelect={(event) => {
                  event.stopPropagation()
                  actions.select(entry.id, event.ctrlKey || event.metaKey, event.shiftKey, orderedIds)
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
