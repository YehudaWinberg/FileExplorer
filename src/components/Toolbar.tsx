import { useExplorer } from '../state/ExplorerContext'
import { Breadcrumbs } from './Breadcrumbs'
import { BackIcon, FolderPlusIcon, ForwardIcon, RefreshIcon, UpIcon } from './icons'

export function Toolbar() {
  const { state, location, actions } = useExplorer()
  const canBack = state.index > 0
  const canForward = state.index < state.history.length - 1
  const isFolder = location.type === 'folder'

  return (
    <div className="toolbar">
      <button type="button" className="btn btn--accent" onClick={() => void actions.pickFolder()}>
        <FolderPlusIcon />
        <span>בחירת תיקייה</span>
      </button>
      <div className="toolbar__nav">
        <button type="button" className="icon-btn" title="חזרה" aria-label="חזרה" disabled={!canBack} onClick={actions.back}>
          <BackIcon />
        </button>
        <button type="button" className="icon-btn" title="קדימה" aria-label="קדימה" disabled={!canForward} onClick={actions.forward}>
          <ForwardIcon />
        </button>
        <button type="button" className="icon-btn" title="תיקיית אב" aria-label="תיקיית אב" disabled={!isFolder} onClick={actions.up}>
          <UpIcon />
        </button>
        <button type="button" className="icon-btn" title="רענון" aria-label="רענון" disabled={!isFolder} onClick={actions.refresh}>
          <RefreshIcon />
        </button>
      </div>
      <Breadcrumbs />
    </div>
  )
}
