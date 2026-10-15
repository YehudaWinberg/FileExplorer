import { useEffect, useState } from 'react'
import { FsError } from '../lib/fileSystem'
import { exifRows, extractFileMetadata, type FileMetadata } from '../lib/metadata'
import type { FileSystemEntry } from '../lib/models/entry'
import { getFileKind, getTypeLabel } from '../lib/utils/fileTypes'
import { formatDate, formatSize } from '../lib/utils/format'
import { useExplorer } from '../state/ExplorerContext'
import { FileKindIcon } from './icons'

type ImageState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; url: string; metadata: FileMetadata }

function useImageDetails(entry: FileSystemEntry, enabled: boolean): ImageState {
  const { adapter } = useExplorer()
  const [result, setResult] = useState<ImageState>({ status: 'loading' })

  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    let url: string | null = null
    adapter
      .getFile(entry)
      .then(async (file) => {
        const metadata = await extractFileMetadata(file)
        if (cancelled) return
        url = URL.createObjectURL(file)
        setResult({ status: 'ready', url, metadata })
      })
      .catch((error: unknown) => {
        if (cancelled) return
        const message = error instanceof FsError ? error.message : 'לא ניתן לקרוא את הקובץ.'
        setResult({ status: 'error', message })
      })
    return () => {
      cancelled = true
      if (url) URL.revokeObjectURL(url)
    }
  }, [adapter, entry, enabled])

  return result
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </>
  )
}

/** מוצג רק עבור קובץ בודד שנבחר. נשמר לפי מזהה כדי שהמצב יתאפס בין קבצים. */
function FileDetails({ entry }: { entry: FileSystemEntry }) {
  const isImage = getFileKind(entry) === 'image' && !entry.unreadable
  const image = useImageDetails(entry, isImage)
  const metadata = image.status === 'ready' ? image.metadata : undefined
  const exif = metadata?.exif ? exifRows(metadata.exif) : []

  return (
    <aside className="details" aria-label="פרטי קובץ">
      <div className="details__header">
        <FileKindIcon kind={getFileKind(entry)} size={32} />
        <span className="details__name" title={entry.name}>{entry.name}</span>
      </div>

      {isImage && image.status === 'loading' && <p className="details__note">טוען תצוגה מקדימה...</p>}
      {isImage && image.status === 'error' && <p className="details__note details__note--error" role="alert">{image.message}</p>}
      {image.status === 'ready' && (
        <div className="details__preview">
          <img src={image.url} alt={`תצוגה מקדימה של ${entry.name}`} />
        </div>
      )}
      {entry.unreadable && (
        <p className="details__note details__note--error" role="alert">לא ניתן לקרוא את הקובץ (ייתכן שאין הרשאה).</p>
      )}

      <dl className="details__list">
        <Row label="סוג" value={getTypeLabel(entry)} />
        {entry.size !== undefined && <Row label="גודל" value={formatSize(entry.size)} />}
        {entry.modified !== undefined && <Row label="תאריך שינוי" value={formatDate(entry.modified)} />}
        {metadata?.size && <Row label="מידות" value={`${metadata.size.width} × ${metadata.size.height} פיקסלים`} />}
      </dl>

      {exif.length > 0 && (
        <>
          <h2 className="details__title">נתוני EXIF</h2>
          <dl className="details__list">
            {exif.map((row) => (
              <Row key={row.label} label={row.label} value={row.value} />
            ))}
          </dl>
        </>
      )}
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
