import { useExplorer } from '../state/useExplorer'
import { FolderTree } from './FolderTree'

export function Sidebar() {
  const { state } = useExplorer()

  return (
    <aside className="sidebar" aria-label="ניווט">
      <div className="sidebar__heading">תיקיות שנבחרו</div>
      {state.roots.length === 0 ? (
        <p className="sidebar__hint">עדיין לא נבחרו תיקיות</p>
      ) : (
        <FolderTree roots={state.roots} />
      )}
    </aside>
  )
}
