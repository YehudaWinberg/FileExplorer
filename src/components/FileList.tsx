import { useMemo, type MouseEvent } from 'react'
import type { FileSystemEntry } from '../lib/models/entry'
import type { SortKey } from '../lib/models/sort'
import { useExplorer } from '../state/ExplorerContext'
import { getFileKind, getTypeLabel } from '../lib/utils/fileTypes'
import { formatDate, formatElapsedDays, formatSize } from '../lib/utils/format'
import { SCALE_GRADIENT, isLargeFile, scaleColor, sizeScalePosition } from '../lib/utils/largeFiles'
import { sortEntries } from '../lib/utils/sortEntries'
import { EmptyState } from './EmptyState'
import { FileKindIcon, SortArrowIcon } from './icons'

const COLUMNS: Array<{ key: SortKey; label: string; className: string }> = [
  { key: 'name', label: 'שם', className: 'col-name' },
  { key: 'modified', label: 'תאריך שינוי', className: 'col-date' },
  { key: 'elapsed', label: 'כמה זמן עבר מהשינוי האחרון', className: 'col-elapsed' },
  { key: 'type', label: 'סוג', className: 'col-type' },
  { key: 'size', label: 'גודל', className: 'col-size' },
]

const LARGE_FILES_LABEL = 'סימון קבצים גדולים'

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

function Row({ entry, selected, onSelect, onOpen }: {
  entry: FileSystemEntry
  selected: boolean
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
      <LargeFileCell entry={entry} />
    </div>
  )
}

export function FileList() {
  const { state, actions } = useExplorer()
  const sorted = useMemo(() => sortEntries(state.entries, state.sort), [state.entries, state.sort])
  const orderedIds = useMemo(() => sorted.map((e) => e.id), [sorted])
  const selected = useMemo(() => new Set(state.selection), [state.selection])

  if (state.status === 'loading') return <EmptyState title="טוען..." />
  if (state.status === 'error') {
    return <EmptyState tone="error" title="לא ניתן להציג את התיקייה" detail={state.error ?? undefined} />
  }

  return (
    <div className="list" role="table" aria-label="תוכן התיקייה" onClick={actions.clearSelection}>
      <div role="row" className="row row--header" onClick={(e) => e.stopPropagation()}>
        {COLUMNS.map(({ key, label, className }) => {
          const active = state.sort.key === key
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
        <div role="columnheader" className="col-large header-static">{LARGE_FILES_LABEL}</div>
      </div>
      {sorted.length === 0 ? (
        <EmptyState title="התיקייה הזו ריקה" />
      ) : (
        sorted.map((entry) => (
          <Row
            key={entry.id}
            entry={entry}
            selected={selected.has(entry.id)}
            onSelect={(event) => {
              event.stopPropagation()
              actions.select(entry.id, event.ctrlKey || event.metaKey, event.shiftKey, orderedIds)
            }}
            onOpen={() => entry.folder && actions.openFolder(entry.folder)}
          />
        ))
      )}
    </div>
  )
}
