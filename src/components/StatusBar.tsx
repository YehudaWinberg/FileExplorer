import { formatTotalGb } from '../lib/utils/format'
import { summarizeEntries } from '../lib/utils/summary'
import { filterByTypes } from '../lib/utils/typeFilter'
import { useExplorer } from '../state/ExplorerContext'

export function StatusBar() {
  const { state, location } = useExplorer()
  const isFolder = location.type === 'folder' && state.status === 'idle'
  const folders = state.entries.filter((e) => e.kind === 'folder').length
  const files = state.entries.length - folders
  const summary = summarizeEntries(filterByTypes(state.entries, state.typeFilter))

  return (
    <footer className="statusbar" aria-live="polite">
      {isFolder && (
        <>
          <span>{folders} תיקיות</span>
          <span>{files} קבצים</span>
          <span>{summary.count} פריטים מוצגים</span>
          <span>סה״כ {formatTotalGb(summary.totalBytes)}</span>
          {state.selection.length > 0 && <span>{state.selection.length} פריטים נבחרו</span>}
        </>
      )}
    </footer>
  )
}
