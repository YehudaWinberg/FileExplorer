import { useEffect, useState } from 'react'
import { extractImageDetails, type ExifTag } from '../lib/exifTags'
import { FsError } from '../lib/fileSystem'
import type { ImageSize } from '../lib/metadata'
import { relativePath, type FileSystemEntry } from '../lib/models/entry'
import { loadPdf } from '../lib/pdf'
import { getFileKind, getTypeLabel } from '../lib/utils/fileTypes'
import { formatDate, formatSizeMb } from '../lib/utils/format'
import { getOpenWithApp } from '../lib/utils/openWith'
import { useExplorer } from '../state/ExplorerContext'
import { MediaPreview, type MediaState } from './MediaPreview'
import { PdfPreview } from './PdfPreview'
import { PDF_LOADING, type PdfState } from './pdfState'

type Async<T> =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; value: T }

const LOADING = { status: 'loading' } as const

/**
 * מצב אסינכרוני המסומן בקובץ שאליו הוא שייך. תוצאה של קובץ אחר לעולם אינה מוצגת,
 * גם אם הגיעה באיחור: עבור קובץ שאין לו עדיין תוצאה מוחזר 'loading'.
 */
function useEntryResult<T>(entry: FileSystemEntry) {
  const [state, setState] = useState<{ entry: FileSystemEntry; result: Async<T> } | null>(null)
  const result: Async<T> = state && state.entry === entry ? state.result : LOADING
  return [result, setState] as const
}

const fileError = (error: unknown) => (error instanceof FsError ? error.message : 'לא ניתן לקרוא את הקובץ.')

/** טוען בנפרד את המידות, נתוני ה-EXIF וכתובת התצוגה המקדימה של תמונה. */
function useImageExtras(entry: FileSystemEntry, enabled: boolean) {
  const { adapter } = useExplorer()
  const [size, setSize] = useEntryResult<ImageSize | null>(entry)
  const [exif, setExif] = useEntryResult<ExifTag[]>(entry)
  const [preview, setPreview] = useEntryResult<string>(entry)

  useEffect(() => {
    if (!enabled) return
    let active = true
    let url: string | null = null
    const set = <T,>(setter: (state: { entry: FileSystemEntry; result: Async<T> }) => void, result: Async<T>) => {
      if (active) setter({ entry, result })
    }

    adapter.getFile(entry).then(
      (file) => {
        if (!active) return
        url = URL.createObjectURL(file)
        set(setPreview, { status: 'ready', value: url })
        extractImageDetails(file).then(
          (details) => {
            set(setSize, { status: 'ready', value: details.size })
            set(
              setExif,
              details.exif
                ? { status: 'ready', value: details.exif }
                : { status: 'error', message: 'לא ניתן לקרוא את נתוני ה-EXIF.' },
            )
          },
          () => {
            set(setSize, { status: 'error', message: 'לא ניתן לקרוא את מידות התמונה.' })
            set(setExif, { status: 'error', message: 'לא ניתן לקרוא את נתוני ה-EXIF.' })
          },
        )
      },
      (error: unknown) => {
        const message = fileError(error)
        set(setPreview, { status: 'error', message })
        set(setSize, { status: 'error', message })
        set(setExif, { status: 'error', message })
      },
    )
    return () => {
      active = false
      if (url) URL.revokeObjectURL(url)
    }
  }, [adapter, entry, enabled, setSize, setExif, setPreview])

  return { size, exif, preview }
}

/** טוען PDF ברקע (עם התקדמות, ביטול ו-timeout) ומחזיר כתובת Blob לתצוגה. תוצאה ישנה לעולם אינה מוצגת. */
function usePdfPreview(entry: FileSystemEntry, enabled: boolean): PdfState {
  const { adapter } = useExplorer()
  const [state, setState] = useState<{ entry: FileSystemEntry; result: PdfState } | null>(null)

  useEffect(() => {
    if (!enabled) return
    const controller = new AbortController()
    let url: string | null = null
    const set = (result: PdfState) => {
      if (!controller.signal.aborted) setState({ entry, result })
    }

    loadPdf(() => adapter.getFile(entry), {
      signal: controller.signal,
      onProgress: (progress) => set({ status: 'loading', progress }),
    }).then(
      ({ blob, pages }) => {
        if (controller.signal.aborted) return
        url = URL.createObjectURL(blob)
        set({ status: 'ready', url, pages })
      },
      () => set({ status: 'error' }),
    )
    return () => {
      controller.abort()
      if (url) URL.revokeObjectURL(url)
    }
  }, [adapter, entry, enabled])

  return state && state.entry === entry ? state.result : PDF_LOADING
}

/** טוען קובץ אודיו/וידאו כ-Blob URL לנגן המותאם. תוצאה של קובץ אחר לעולם אינה מוצגת. */
function useMediaPreview(entry: FileSystemEntry, enabled: boolean): MediaState {
  const { adapter } = useExplorer()
  const [state, setState] = useState<{ entry: FileSystemEntry; result: MediaState } | null>(null)

  useEffect(() => {
    if (!enabled) return
    let active = true
    let url: string | null = null
    adapter.getFile(entry).then(
      (file) => {
        if (!active) return
        url = URL.createObjectURL(file)
        setState({ entry, result: { status: 'ready', url } })
      },
      (error: unknown) => {
        if (active) setState({ entry, result: { status: 'error', message: fileError(error) } })
      },
    )
    return () => {
      active = false
      if (url) URL.revokeObjectURL(url)
    }
  }, [adapter, entry, enabled])

  return state && state.entry === entry ? state.result : { status: 'loading' }
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </>
  )
}

function ExifSection({ exif }: { exif: Async<ExifTag[]> }) {
  return (
    <section aria-label="נתוני EXIF">
      <h2 className="details__title">נתוני EXIF</h2>
      {exif.status === 'loading' && <p className="details__note" role="status">טוען נתוני EXIF...</p>}
      {exif.status === 'error' && <p className="details__note details__note--error">{exif.message}</p>}
      {exif.status === 'ready' && exif.value.length === 0 && (
        <p className="details__note">אין נתוני EXIF זמינים בקובץ זה.</p>
      )}
      {exif.status === 'ready' && exif.value.length > 0 && (
        <dl className="details__list">
          {exif.value.map((tag) => (
            <Row key={`${tag.group}-${tag.tag}`} label={tag.label} value={tag.value} />
          ))}
        </dl>
      )}
    </section>
  )
}

function PreviewSection({ name, preview }: { name: string; preview: Async<string> }) {
  const [image, setImage] = useState<{ url: string; status: 'loaded' | 'error' } | null>(null)
  const url = preview.status === 'ready' ? preview.value : null
  const imageStatus = url && image?.url === url ? image.status : 'loading'
  const failed = preview.status === 'error' || imageStatus === 'error'

  return (
    <section className="details__preview-section" aria-label="תצוגה מקדימה">
      <h2 className="details__title">תצוגה מקדימה</h2>
      {!failed && imageStatus === 'loading' && (
        <p className="details__note" role="status">טוען תצוגה מקדימה...</p>
      )}
      {failed && (
        <p className="details__note details__note--error">
          {preview.status === 'error' ? preview.message : 'לא ניתן להציג את התמונה.'}
        </p>
      )}
      {url && imageStatus !== 'error' && (
        <div className="details__preview" hidden={imageStatus !== 'loaded'}>
          <img
            src={url}
            alt={`תצוגה מקדימה של ${name}`}
            onLoad={() => setImage({ url, status: 'loaded' })}
            onError={() => setImage({ url, status: 'error' })}
          />
        </div>
      )}
    </section>
  )
}

/**
 * מידע מורחב על קובץ בודד בתוך חלונית הפרטים: מידע כללי מיידי,
 * ועבור תמונות גם מידות, EXIF ותצוגה מקדימה שנטענים בנפרד.
 */
export function FileInfo({ entry }: { entry: FileSystemEntry }) {
  const { location } = useExplorer()
  const isImage = getFileKind(entry) === 'image' && !entry.unreadable
  const isPdf = getFileKind(entry) === 'pdf' && !entry.unreadable
  const { size, exif, preview } = useImageExtras(entry, isImage)
  const pdfPreview = usePdfPreview(entry, isPdf)
  const kind = getFileKind(entry)
  const mediaKind = (kind === 'audio' || kind === 'video') && !entry.unreadable ? kind : null
  const mediaPreview = useMediaPreview(entry, mediaKind !== null)
  const app = getOpenWithApp(entry.extension)
  const path = location.type === 'folder' ? relativePath(location.folder, entry.name) : undefined
  const dimensions = size.status === 'ready' ? size.value : null

  return (
    <div className="file-info">
      <dl className="details__list">
        <Row label="שם" value={entry.name} />
        <Row label="סוג" value={getTypeLabel(entry)} />
        {app && <Row label="נפתח באמצעות" value={app} />}
        {path && <Row label="מיקום" value={path} />}
        {entry.size !== undefined && <Row label="גודל" value={formatSizeMb(entry.size)} />}
        {entry.modified !== undefined && <Row label="תאריך שינוי" value={formatDate(entry.modified)} />}
        {dimensions && <Row label="רוחב" value={`${dimensions.width} פיקסלים`} />}
        {dimensions && <Row label="גובה" value={`${dimensions.height} פיקסלים`} />}
      </dl>
      {isImage && size.status === 'loading' && (
        <p className="details__note" role="status">טוען מידות תמונה...</p>
      )}

      {isImage && <ExifSection exif={exif} />}
      {isImage && <PreviewSection key={entry.id} name={entry.name} preview={preview} />}
      {isPdf && <PdfPreview key={entry.id} name={entry.name} state={pdfPreview} />}
      {mediaKind && <MediaPreview key={entry.id} name={entry.name} kind={mediaKind} state={mediaPreview} />}
    </div>
  )
}
