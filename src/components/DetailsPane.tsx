import { relativePath, type FileSystemEntry } from '../lib/models/entry'
import { getFileKind, getTypeLabel } from '../lib/utils/fileTypes'
import { useExplorer } from '../state/ExplorerContext'
import { useSearchOptional } from '../state/SearchContext'
import { useSelectedEntry } from '../state/selectors'
import { FileInfo } from './FileInfo'
import { FileKindIcon } from './icons'

/** מוצג רק עבור קובץ בודד שנבחר. נשמר לפי מזהה כדי שהמצב יתאפס בין קבצים. */
function FileDetails({ entry, searching }: { entry: FileSystemEntry; searching: boolean }) {
  return (
    <aside className={searching ? 'details details--search' : 'details'} aria-label="פרטי קובץ">
      <div className="details__header">
        <FileKindIcon kind={getFileKind(entry)} size={32} />
        <span className="details__name" title={entry.name}>{entry.name}</span>
      </div>

      {entry.unreadable && (
        <p className="details__note details__note--error" role="alert">לא ניתן לקרוא את הקובץ (ייתכן שאין הרשאה).</p>
      )}

      <FileInfo entry={entry} />
    </aside>
  )
}

/** תיקייה שנבחרה: פרטים בלבד, בלי תצוגה מקדימה (FR26). */
function FolderDetails({ entry }: { entry: FileSystemEntry }) {
  const session = useSearchOptional()?.session
  const parent = session?.results.find((r) => r.entry.id === entry.id)?.parent
  return (
    <aside className="details details--search" aria-label="פרטי תיקייה">
      <div className="details__header">
        <FileKindIcon kind="folder" size={32} />
        <span className="details__name" title={entry.name}>{entry.name}</span>
      </div>
      <dl className="details__list">
        <dt>שם</dt>
        <dd>{entry.name}</dd>
        <dt>סוג</dt>
        <dd>{getTypeLabel(entry)}</dd>
        {parent && (
          <>
            <dt>מיקום</dt>
            <dd>{relativePath(parent, entry.name)}</dd>
          </>
        )}
      </dl>
    </aside>
  )
}

export function DetailsPane() {
  const { location } = useExplorer()
  const entry = useSelectedEntry()
  const searching = location.type === 'search'
  if (entry?.kind === 'folder' && searching) return <FolderDetails entry={entry} />
  if (!entry || entry.kind !== 'file') {
    if (!searching) return null
    return (
      <aside className="details details--search" aria-label="פרטי קובץ">
        <p className="details__note">בחרו תוצאה כדי לראות תצוגה מקדימה</p>
      </aside>
    )
  }
  return <FileDetails key={entry.id} entry={entry} searching={searching} />
}
