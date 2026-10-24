import type { FileSystemEntry } from '../lib/models/entry'
import { getFileKind } from '../lib/utils/fileTypes'
import { useExplorer } from '../state/ExplorerContext'
import { useSelectedEntry } from '../state/selectors'
import { FileInfo } from './FileInfo'
import { FileKindIcon } from './icons'

/** מוצג רק עבור קובץ בודד שנבחר. נשמר לפי מזהה כדי שהמצב יתאפס בין קבצים. */
function FileDetails({ entry }: { entry: FileSystemEntry }) {
  return (
    <aside className="details" aria-label="פרטי קובץ">
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

export function DetailsPane() {
  const { location } = useExplorer()
  const entry = useSelectedEntry()
  if (!entry || entry.kind !== 'file') {
    if (location.type !== 'search') return null
    return (
      <aside className="details" aria-label="פרטי קובץ">
        <p className="details__note">בחרו תוצאה כדי לראות תצוגה מקדימה</p>
      </aside>
    )
  }
  return <FileDetails key={entry.id} entry={entry} />
}
