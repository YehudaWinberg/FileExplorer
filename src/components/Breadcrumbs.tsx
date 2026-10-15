import { folderChain, type Location } from '../lib/models/entry'
import { useExplorer } from '../state/ExplorerContext'
import { ChevronIcon, FolderIcon, HomeIcon, PcIcon, StarIcon } from './icons'

function leadingIcon(location: Location) {
  if (location.type === 'home') return <HomeIcon />
  if (location.type === 'quick') return <StarIcon />
  if (location.type === 'pc') return <PcIcon />
  return <FolderIcon size={16} />
}

export function Breadcrumbs() {
  const { location, actions } = useExplorer()

  return (
    <nav className="address" aria-label="נתיב נוכחי">
      <span className="address__icon">{leadingIcon(location)}</span>
      <ol className="crumbs">
        {location.type === 'home' && <li className="crumb crumb--current">בית</li>}
        {location.type === 'quick' && <li className="crumb crumb--current">גישה מהירה</li>}
        {location.type === 'pc' && <li className="crumb crumb--current">המחשב שלי</li>}
        {location.type === 'folder' &&
          folderChain(location.folder).map((folder, i, chain) => (
            <li key={folder.id} className="crumbs__item">
              {i > 0 && <ChevronIcon size={12} className="crumbs__sep" />}
              <button
                type="button"
                className={i === chain.length - 1 ? 'crumb crumb--current' : 'crumb'}
                onClick={() => actions.openFolder(folder)}
              >
                {folder.name}
              </button>
            </li>
          ))}
      </ol>
    </nav>
  )
}
