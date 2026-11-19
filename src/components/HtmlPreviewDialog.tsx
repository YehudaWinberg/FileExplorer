import { useEffect, useRef, useState } from 'react'
import { HTML_PREVIEW_MAX_BYTES, buildPreviewHtml } from '../lib/utils/htmlPreview'
import { FsError } from '../lib/fileSystem'
import type { FileSystemEntry } from '../lib/models/entry'
import { useExplorer } from '../state/useExplorer'

const LOAD_ERROR = 'לא ניתן לקרוא את הקובץ.'
const TOO_LARGE = 'הקובץ גדול מדי לתצוגה מקדימה (מעל 5MB).'

type State = { status: 'loading' } | { status: 'ready'; url: string } | { status: 'error'; message: string }

/**
 * דיאלוג מודאלי (80% מהמסך) עם תצוגה מקדימה של דף HTML, לקריאה בלבד:
 * הקובץ נטען כ-Blob URL ל-iframe עם sandbox מלא (ללא סקריפטים), ללא כתיבה וללא רשת.
 */
export function HtmlPreviewDialog({ entry, onClose }: { entry: FileSystemEntry; onClose: () => void }) {
  const { adapter } = useExplorer()
  const [state, setState] = useState<State>({ status: 'loading' })
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    let active = true
    let url: string | null = null
    const fail = (message: string) => {
      if (active) setState({ status: 'error', message })
    }
    adapter.getFile(entry).then(
      async (file) => {
        if (file.size > HTML_PREVIEW_MAX_BYTES) return fail(TOO_LARGE)
        const text = await file.text()
        if (!active) return
        const blob = new Blob([buildPreviewHtml(text)], { type: 'text/html;charset=utf-8' })
        url = URL.createObjectURL(blob)
        setState({ status: 'ready', url })
      },
      (error: unknown) => fail(error instanceof FsError ? error.message : LOAD_ERROR),
    ).catch(() => fail(LOAD_ERROR))
    return () => {
      active = false
      if (url) URL.revokeObjectURL(url)
    }
  }, [adapter, entry])

  const dialogRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null
    closeRef.current?.focus()
    // האזנה בשלב ה-capture: Escape ו-Tab נשארים בדיאלוג ואינם מגיעים למאזינים שמאחוריו.
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onClose()
      } else if (event.key === 'Tab') {
        const items = dialogRef.current?.querySelectorAll<HTMLElement>('button, iframe, [tabindex]:not([tabindex="-1"])')
        if (!items || items.length === 0) return
        const first = items[0]
        const last = items[items.length - 1]
        const active = document.activeElement
        if (!dialogRef.current?.contains(active)) {
          event.preventDefault()
          first.focus()
        } else if (event.shiftKey && active === first) {
          event.preventDefault()
          last.focus()
        } else if (!event.shiftKey && active === last) {
          event.preventDefault()
          first.focus()
        }
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => {
      window.removeEventListener('keydown', onKey, true)
      opener?.focus?.()
    }
  }, [onClose])

  return (
    <div className="html-preview-backdrop" onClick={onClose}>
      <div
        ref={dialogRef}
        className="html-preview"
        role="dialog"
        aria-modal="true"
        aria-label={`תצוגה מקדימה של ${entry.name}`}
        onClick={(event) => event.stopPropagation()}
        onDoubleClick={(event) => event.stopPropagation()}
      >
        <div className="html-preview__header">
          <button
            ref={closeRef}
            type="button"
            className="icon-btn html-preview__close"
            aria-label="סגירה"
            onClick={onClose}
          >
            ✕
          </button>
          <span className="html-preview__title ellipsis" title={entry.name}>{entry.name}</span>
        </div>
        <div className="html-preview__body">
          {state.status === 'loading' && <p className="details__note" role="status">טוען תצוגה מקדימה...</p>}
          {state.status === 'error' && <p className="details__note details__note--error">{state.message}</p>}
          {state.status === 'ready' && (
            <iframe className="html-preview__frame" title={`תוכן ${entry.name}`} src={state.url} sandbox="" />
          )}
        </div>
      </div>
    </div>
  )
}
