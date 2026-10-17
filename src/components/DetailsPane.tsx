import type { FileSystemEntry } from '../lib/models/entry'
import { getFileKind } from '../lib/utils/fileTypes'
import { useExplorer } from '../state/ExplorerContext'
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
  const { state } = useExplorer()
  if (state.selection.length !== 1) return null
  const entry = state.entries.find((e) => e.id === state.selection[0])
  if (!entry || entry.kind !== 'file') return null
  return <FileDetails key={entry.id} entry={entry} />
}
