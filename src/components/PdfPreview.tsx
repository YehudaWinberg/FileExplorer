import { PDF_ERROR_MESSAGE, type PdfState } from './pdfState'

const RADIUS = 20
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

/** חיווי טעינה עגול: מלא לפי progress (0-1), ובלי progress - מסתובב ללא אחוזים. */
export function CircularProgress({ progress }: { progress: number | null }) {
  const percent = progress === null ? null : Math.round(Math.min(1, Math.max(0, progress)) * 100)
  return (
    <div
      className="circular-progress"
      role="progressbar"
      aria-label="טוען קובץ"
      aria-valuemin={percent === null ? undefined : 0}
      aria-valuemax={percent === null ? undefined : 100}
      aria-valuenow={percent ?? undefined}
    >
      <svg
        viewBox="0 0 50 50"
        className={percent === null ? 'circular-progress__svg circular-progress__svg--spin' : 'circular-progress__svg'}
        aria-hidden="true"
      >
        <circle className="circular-progress__track" cx="25" cy="25" r={RADIUS} />
        <circle
          className="circular-progress__bar"
          cx="25"
          cy="25"
          r={RADIUS}
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE * (1 - (percent ?? 25) / 100)}
        />
      </svg>
      {percent !== null && <span className="circular-progress__label">{percent}%</span>}
    </div>
  )
}

/** תצוגה מקדימה של PDF: שם הקובץ ומספר העמודים מעל הצופה, חיווי טעינה או הודעת שגיאה. */
export function PdfPreview({ name, state }: { name: string; state: PdfState }) {
  return (
    <section className="details__preview-section" aria-label="תצוגה מקדימה">
      <h2 className="details__title">תצוגה מקדימה</h2>
      {state.status === 'loading' && (
        <div className="details__preview details__preview--pdf" role="status" aria-label="טוען תצוגה מקדימה">
          <CircularProgress progress={state.progress} />
        </div>
      )}
      {state.status === 'error' && <p className="details__note details__note--error">{PDF_ERROR_MESSAGE}</p>}
      {state.status === 'ready' && (
        <>
          <p className="pdf-preview__name">{name}</p>
          <p className="pdf-preview__pages">
            מספר עמודים: {state.pages === null ? 'לא ידוע' : state.pages}
          </p>
          <div className="details__preview details__preview--pdf">
            <iframe className="pdf-preview__frame" src={state.url} title={`תצוגה מקדימה של ${name}`} />
          </div>
        </>
      )}
    </section>
  )
}
