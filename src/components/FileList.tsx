import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react'
import type { FileSystemEntry } from '../lib/models/entry'
import type { SortKey } from '../lib/models/sort'
import { useExplorer } from '../state/ExplorerContext'
import { getFileKind, getTypeLabel } from '../lib/utils/fileTypes'
import { formatCount, formatDate, formatElapsedDays, formatSize } from '../lib/utils/format'
import { SCALE_GRADIENT, isLargeFile, scaleColor, sizeScalePosition } from '../lib/utils/largeFiles'
import { sortEntries } from '../lib/utils/sortEntries'
import { filterByTypes, getTypeOptions } from '../lib/utils/typeFilter'
import { EmptyState } from './EmptyState'
import { FileKindIcon, FilterIcon, SortArrowIcon } from './icons'
import { useLineCounts, type LineCount } from './useLineCounts'

const COLUMNS: Array<{ key: SortKey; label: string; className: string }> = [
  { key: 'name', label: 'שם', className: 'col-name' },
  { key: 'modified', label: 'תאריך שינוי', className: 'col-date' },
  { key: 'elapsed', label: 'כמה זמן עבר מהשינוי האחרון', className: 'col-elapsed' },
  { key: 'type', label: 'סוג', className: 'col-type' },
  { key: 'size', label: 'גודל', className: 'col-size' },
]

const LARGE_FILES_LABEL = 'סימון קבצים גדולים'
const LINE_COUNT_LABEL = 'מספר שורות'
const COUNTING_LINES = 'סופר שורות...'

/** מספר השורות בקובץ TXT; מקף עבור כל פריט אחר. */
function LineCountCell({ count }: { count: LineCount | null }) {
  if (!count) return <div role="cell" className="col-lines">—</div>
  if (count.status === 'loading') {
    return (
      <div role="cell" className="col-lines" aria-busy="true" aria-label={COUNTING_LINES} title={COUNTING_LINES}>
        <span className="line-count__spinner" />
      </div>
    )
  }
  if (count.status === 'error') {
    return <div role="cell" className="col-lines line-count--error" title={count.message}>שגיאת קריאה</div>
  }
  return <div role="cell" className="col-lines">{formatCount(count.value)}</div>
}

function LargeFileCell({ entry }: { entry: FileSystemEntry }) {
  if (entry.kind !== 'file' || entry.size === undefined) return <div role="cell" className="col-large" />
  const position = sizeScalePosition(entry.size)
  const large = isLargeFile(entry)
  return (
    <div role="cell" className="col-large" data-large={large} title={large ? 'קובץ גדול' : undefined}>
      <div className="size-scale">
        <div className="size-scale__bar" style={{ background: SCALE_GRADIENT }}>
          <span
            className="size-scale__marker"
            style={{ left: `${position * 100}%`, borderTopColor: scaleColor(position) }}
          />
        </div>
      </div>
      <span className="size-scale__text">{formatSize(entry.size)}</span>
    </div>
  )
}

function Row({ entry, selected, lineCount, onSelect, onOpen }: {
  entry: FileSystemEntry
  selected: boolean
  lineCount: LineCount | null
  onSelect: (event: MouseEvent) => void
  onOpen: () => void
}) {
  return (
    <div
      role="row"
      aria-selected={selected}
      className={selected ? 'row row--selected' : 'row'}
      onClick={onSelect}
      onDoubleClick={onOpen}
    >
      <div role="cell" className="col-name cell-name">
        <FileKindIcon kind={getFileKind(entry)} size={18} />
        <span className="ellipsis" title={entry.name}>{entry.name}</span>
      </div>
      <div role="cell" className="col-date">{formatDate(entry.modified)}</div>
      <div role="cell" className="col-elapsed">{formatElapsedDays(entry.modified)}</div>
      <div role="cell" className="col-type">{getTypeLabel(entry)}</div>
      <div role="cell" className="col-size">{entry.kind === 'file' ? formatSize(entry.size) : ''}</div>
      <LineCountCell count={lineCount} />
      <LargeFileCell entry={entry} />
    </div>
  )
}

function TypeFilterMenu({ options, selected, onToggle, onClear }: {
  options: string[]
  selected: string[]
  onToggle: (label: string) => void
  onClear: () => void
}) {
  return (
    <div className="filter-menu" role="dialog" aria-label="סינון לפי סוג">
      <div className="filter-menu__options">
        {options.map((label) => (
          <label key={label} className="filter-menu__option">
            <input type="checkbox" checked={selected.includes(label)} onChange={() => onToggle(label)} />
            <span>{label}</span>
          </label>
        ))}
      </div>
      <button type="button" className="filter-menu__clear" disabled={selected.length === 0} onClick={onClear}>
        נקה סינון
      </button>
    </div>
  )
}

function TypeHeader({ label, className, sortState, onSort, options, selected, onToggle, onClear }: {
  label: string
  className: string
  sortState: 'ascending' | 'descending' | 'none'
  onSort: () => void
  options: string[]
  selected: string[]
  onToggle: (label: string) => void
  onClear: () => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const active = selected.length > 0

  useEffect(() => {
    if (!open) return
    const onDown = (event: globalThis.MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={ref} role="columnheader" aria-sort={sortState} className={`${className} header-filterable`}>
      <button type="button" className="header-cell header-filterable__sort" onClick={onSort}>
        <span>{label}</span>
        {sortState !== 'none' && (
          <SortArrowIcon size={10} className={sortState === 'descending' ? 'sort sort--desc' : 'sort'} />
        )}
      </button>
      <button
        type="button"
        className={active ? 'filter-button filter-button--active' : 'filter-button'}
        aria-label="סינון לפי סוג"
        aria-haspopup="dialog"
        aria-expanded={open}
        data-active={active}
        onClick={() => setOpen((v) => !v)}
      >
        <FilterIcon size={12} active={active} />
      </button>
      {open && <TypeFilterMenu options={options} selected={selected} onToggle={onToggle} onClear={onClear} />}
    </div>
  )
}

export function FileList() {
  const { state, actions } = useExplorer()
  const typeOptions = useMemo(() => getTypeOptions(state.entries), [state.entries])
  const filtered = useMemo(() => filterByTypes(state.entries, state.typeFilter), [state.entries, state.typeFilter])
  const sorted = useMemo(() => sortEntries(filtered, state.sort), [filtered, state.sort])
  const orderedIds = useMemo(() => sorted.map((e) => e.id), [sorted])
  const selected = useMemo(() => new Set(state.selection), [state.selection])
  const lineCountOf = useLineCounts(state.entries)

  if (state.status === 'loading') return <EmptyState title="טוען..." />
  if (state.status === 'error') {
    return <EmptyState tone="error" title="לא ניתן להציג את התיקייה" detail={state.error ?? undefined} />
  }

  return (
    <div className="file-view">
      <div className="file-view__scroll">
        <div className="list" role="table" aria-label="תוכן התיקייה" onClick={actions.clearSelection}>
          <div role="row" className="row row--header" onClick={(e) => e.stopPropagation()}>
            {COLUMNS.map(({ key, label, className }) => {
              const active = state.sort.key === key
              if (key === 'type') {
                return (
                  <TypeHeader
                    key={key}
                    label={label}
                    className={className}
                    sortState={active ? (state.sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
                    onSort={() => actions.sortBy(key)}
                    options={typeOptions}
                    selected={state.typeFilter}
                    onToggle={actions.toggleTypeFilter}
                    onClear={actions.clearTypeFilter}
                  />
                )
              }
              return (
                <button
                  key={key}
                  type="button"
                  role="columnheader"
                  className={`${className} header-cell`}
                  aria-sort={active ? (state.sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
                  onClick={() => actions.sortBy(key)}
                >
                  <span>{label}</span>
                  {active && (
                    <SortArrowIcon
                      size={10}
                      className={state.sort.direction === 'desc' ? 'sort sort--desc' : 'sort'}
                    />
                  )}
                </button>
              )
            })}
            <div role="columnheader" className="col-lines header-static">{LINE_COUNT_LABEL}</div>
            <div role="columnheader" className="col-large header-static">{LARGE_FILES_LABEL}</div>
          </div>
          {sorted.length === 0 ? (
            <EmptyState title={state.typeFilter.length ? 'אין פריטים התואמים לסינון' : 'התיקייה הזו ריקה'} />
          ) : (
            sorted.map((entry) => (
              <Row
                key={entry.id}
                entry={entry}
                selected={selected.has(entry.id)}
                lineCount={lineCountOf(entry)}
                onSelect={(event) => {
                  event.stopPropagation()
                  actions.select(entry.id, event.ctrlKey || event.metaKey, event.shiftKey, orderedIds)
                }}
                onOpen={() => entry.folder && actions.openFolder(entry.folder)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  )
}
