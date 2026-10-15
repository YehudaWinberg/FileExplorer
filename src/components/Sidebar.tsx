import type { ReactNode } from 'react'
import type { Location } from '../lib/models/entry'
import { sameLocation } from '../lib/models/entry'
import { useExplorer } from '../state/ExplorerContext'
import { FolderTree } from './FolderTree'
import { HomeIcon, PcIcon, StarIcon } from './icons'
import { SPECIAL_FOLDERS } from './specialFolders'

function NavItem({
  icon,
  label,
  active,
  inactive,
  title,
  onClick,
}: {
  icon: ReactNode
  label: string
  active?: boolean
  inactive?: boolean
  title?: string
  onClick: () => void
}) {
  const className = ['nav-item', active && 'nav-item--active', inactive && 'nav-item--inactive']
    .filter(Boolean)
    .join(' ')
  return (
    <button type="button" className={className} title={title} onClick={onClick}>
      <span className="nav-item__icon">{icon}</span>
      <span className="ellipsis">{label}</span>
    </button>
  )
}

export function Sidebar() {
  const { state, location, actions } = useExplorer()
    const is = (target: Location) => sameLocation(location, target)

  return (
    <aside className="sidebar" aria-label="ניווט">
      <NavItem
        icon={<HomeIcon />}
        label="בית"
        active={is({ type: 'home' })}
        onClick={() => actions.navigate({ type: 'home' })}
      />
      <NavItem
        icon={<StarIcon />}
        label="גישה מהירה"
        active={is({ type: 'quick' })}
        onClick={() => actions.navigate({ type: 'quick' })}
      />
      <NavItem
        icon={<PcIcon />}
        label="המחשב שלי"
        active={is({ type: 'pc' })}
        onClick={() => actions.navigate({ type: 'pc' })}
      />
      <div className="sidebar__sep" />
      {SPECIAL_FOLDERS.map(({ key, label, icon }) => {
        const folder = state.specials[key]
        return (
          <NavItem
            key={key}
            icon={icon}
            label={label}
            inactive={!folder}
            title={folder ? undefined : 'לא ניתנה גישה. לחץ כדי לבחור את התיקייה'}
            active={folder ? is({ type: 'folder', folder }) : false}
            onClick={() => (folder ? actions.openFolder(folder) : void actions.pickFolder(key))}
          />
        )
      })}
      <div className="sidebar__sep" />
      <div className="sidebar__heading">תיקיות שנבחרו</div>
      {state.roots.length === 0 ? (
        <p className="sidebar__hint">עדיין לא נבחרו תיקיות</p>
      ) : (
        <FolderTree roots={state.roots} />
      )}
    </aside>
  )
}
