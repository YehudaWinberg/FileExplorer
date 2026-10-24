import { useState } from 'react'
import { useExplorer } from '../state/ExplorerContext'
import { Breadcrumbs } from './Breadcrumbs'
import { BackIcon, FolderPlusIcon, ForwardIcon, RefreshIcon, UpIcon } from './icons'
import { SearchBox } from './SearchBox'

/** שורה עליונה: ניווט, בחירת תיקייה, כתובת גמישה ותיבת חיפוש. */
export function Toolbar() {
  const { state, location, actions } = useExplorer()
  const [searchFocused, setSearchFocused] = useState(false)
  const canBack = state.index > 0
  const canForward = state.index < state.history.length - 1
  const isFolder = location.type === 'folder' || location.type === 'search'

  return (
    <div className="toolbar">
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
      <button
        type="button"
        className="icon-btn"
        title="בחירת תיקייה"
        aria-label="בחירת תיקייה"
        onClick={() => void actions.pickFolder()}
      >
        <FolderPlusIcon />
      </button>
      <Breadcrumbs compact={searchFocused} />
      <SearchBox onFocusChange={setSearchFocused} />
    </div>
  )
}
