import type { FolderRef } from '../lib/models/entry'
import { useExplorer } from '../state/ExplorerContext'
import { EmptyState } from './EmptyState'
import { FolderIcon } from './icons'
import { SPECIAL_FOLDERS } from './specialFolders'

function RootPlaces({ folders }: { folders: FolderRef[] }) {
  const { actions } = useExplorer()
  return (
    <div className="places" role="list">
      {folders.map((folder) => (
        <button key={folder.id} type="button" role="listitem" className="place" onClick={() => actions.openFolder(folder)}>
          <FolderIcon size={40} />
          <span className="place__name ellipsis">{folder.name}</span>
        </button>
      ))}
    </div>
  )
}

function SpecialPlaces() {
  const { state, actions } = useExplorer()
  return (
    <div className="places" role="list">
      {SPECIAL_FOLDERS.map(({ key, label, icon }) => {
        const folder = state.specials[key]
        return (
          <button
            key={key}
            type="button"
            role="listitem"
            className={folder ? 'place' : 'place place--inactive'}
            title={folder ? undefined : 'לא ניתנה גישה. לחץ כדי לבחור את התיקייה'}
            onClick={() => (folder ? actions.openFolder(folder) : void actions.pickFolder(key))}
          >
            <span className="place__icon">{icon}</span>
            <span className="place__name ellipsis">{label}</span>
            {!folder && <span className="place__hint">לחץ לבחירה</span>}
          </button>
        )
      })}
    </div>
  )
}

/** מסכי "בית", "גישה מהירה" (תיקיות מערכת) ו"המחשב שלי" (תיקיות מערכת ותיקיות שנבחרו). */
export function PlacesView({ mode }: { mode: 'home' | 'quick' | 'pc' }) {
  const { state } = useExplorer()

  if (mode === 'quick') return <SpecialPlaces />

  if (mode === 'pc') {
    return (
      <div>
        <h2 className="section-title">תיקיות המחשב</h2>
        <SpecialPlaces />
        <h2 className="section-title">תיקיות שנבחרו (למשל בכוננים אחרים)</h2>
        {state.roots.length === 0 ? (
          <p className="section-hint">
            הדפדפן אינו מאפשר להציג כוננים אוטומטית. לחץ על ״בחירת תיקייה״ ובחר תיקייה בכונן שתרצה, והיא תופיע כאן.
          </p>
        ) : (
          <RootPlaces folders={state.roots} />
        )}
      </div>
    )
  }

  if (state.roots.length === 0) {
    return (
      <EmptyState
        title="עדיין לא נבחרה תיקייה"
        detail="לחץ על ״בחירת תיקייה״ כדי להתחיל לעיין בקבצים מהמחשב שלך."
      />
    )
  }
  return <RootPlaces folders={state.roots} />
}
