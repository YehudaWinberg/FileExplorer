import { formatTotalGb } from '../lib/utils/format'
import { summarizeEntries } from '../lib/utils/summary'
import { useExplorer } from '../state/ExplorerContext'
import { useVisibleEntries } from '../state/selectors'

export function StatusBar() {
  const { state, location } = useExplorer()
  const visible = useVisibleEntries()
  const isFolder = location.type === 'folder' && state.status === 'idle'
  const folders = state.entries.filter((e) => e.kind === 'folder').length
  const files = state.entries.length - folders
  const summary = summarizeEntries(visible)

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
      {location.type === 'search' && (
        <>
          <span className="tabular">{visible.length} תוצאות</span>
          {state.selection.length > 0 && <span>{state.selection.length} פריטים נבחרו</span>}
        </>
      )}
    </footer>
  )
}
