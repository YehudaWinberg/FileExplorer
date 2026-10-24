import { folderChain, type FolderRef, type Location } from '../lib/models/entry'
import { useExplorer } from '../state/ExplorerContext'
import { ChevronIcon, FolderIcon, HomeIcon, PcIcon, StarIcon } from './icons'

function leadingIcon(location: Location) {
  if (location.type === 'home') return <HomeIcon />
  if (location.type === 'quick') return <StarIcon />
  if (location.type === 'pc') return <PcIcon />
  return <FolderIcon size={16} />
}

/** כתובת מקוצרת בזמן שתיבת החיפוש בפוקוס: `… › שם-תיקייה`. */
function compactName(location: Location): string | null {
  if (location.type === 'folder') return location.folder.name
  if (location.type === 'search') return location.root.name
  return null
}

function FolderCrumbs({ folder, onOpen }: { folder: FolderRef; onOpen: (folder: FolderRef) => void }) {
  return folderChain(folder).map((item, i, chain) => (
    <li key={item.id} className="crumbs__item">
      {i > 0 && <ChevronIcon size={12} className="crumbs__sep" />}
      <button
        type="button"
        className={i === chain.length - 1 ? 'crumb crumb--current' : 'crumb'}
        onClick={() => onOpen(item)}
      >
        {item.name}
      </button>
    </li>
  ))
}

export function Breadcrumbs({ compact = false }: { compact?: boolean }) {
  const { location, actions } = useExplorer()
  const shortName = compact ? compactName(location) : null

  return (
    <nav className="address" aria-label="נתיב נוכחי">
      <span className="address__icon">{leadingIcon(location)}</span>
      <ol className="crumbs">
        {shortName !== null ? (
          <li className="crumbs__item">
            <span className="crumb">…</span>
            <ChevronIcon size={12} className="crumbs__sep" />
            <span className="crumb crumb--current">{shortName}</span>
          </li>
        ) : (
          <>
            {location.type === 'home' && <li className="crumb crumb--current">בית</li>}
            {location.type === 'quick' && <li className="crumb crumb--current">גישה מהירה</li>}
            {location.type === 'pc' && <li className="crumb crumb--current">המחשב שלי</li>}
            {location.type === 'folder' && <FolderCrumbs folder={location.folder} onOpen={actions.openFolder} />}
            {location.type === 'search' && <FolderCrumbs folder={location.root} onOpen={actions.openFolder} />}
          </>
        )}
      </ol>
    </nav>
  )
}
