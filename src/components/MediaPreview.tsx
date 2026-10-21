import { useRef, useState } from 'react'
import { formatDuration } from '../lib/utils/format'

export type MediaState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; url: string }

const MEDIA_ERROR_MESSAGE = 'לא ניתן להפעיל את הקובץ'

const PlayIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
    <path d="M4 2.5v11l9-5.5z" />
  </svg>
)

const PauseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
    <path d="M3.5 2.5h3v11h-3zM9.5 2.5h3v11h-3z" />
  </svg>
)

/**
 * נגן אודיו/וידאו מותאם: אלמנט HTML5 ללא פקדי דפדפן, כפתור הפעלה/השהיה ומשך הקובץ.
 * הרכיב נשמר לפי מזהה הקובץ, כך שהמצב מתאפס בין קבצים.
 */
export function MediaPreview({ name, kind, state }: { name: string; kind: 'audio' | 'video'; state: MediaState }) {
  const ref = useRef<HTMLVideoElement & HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [duration, setDuration] = useState<number | null>(null)
  const [failed, setFailed] = useState(false)

  const toggle = () => {
    const media = ref.current
    if (!media) return
    if (media.paused) media.play().catch(() => setFailed(true))
    else media.pause()
  }

  const handlers = {
    onLoadedMetadata: () => setDuration(ref.current?.duration ?? null),
    onDurationChange: () => setDuration(ref.current?.duration ?? null),
    onPlay: () => setPlaying(true),
    onPause: () => setPlaying(false),
    onEnded: () => setPlaying(false),
    onError: () => setFailed(true),
  }
  const label = `${kind === 'video' ? 'וידאו' : 'שמע'}: ${name}`

  return (
    <section className="details__preview-section" aria-label="תצוגה מקדימה">
      <h2 className="details__title">תצוגה מקדימה</h2>
      {state.status === 'loading' && <p className="details__note" role="status">טוען תצוגה מקדימה...</p>}
      {state.status === 'error' && <p className="details__note details__note--error">{state.message}</p>}
      {state.status === 'ready' && (
        <>
          {failed && <p className="details__note details__note--error" role="alert">{MEDIA_ERROR_MESSAGE}</p>}
          <div className="media-preview" hidden={failed}>
            {kind === 'video' ? (
              <div className="details__preview details__preview--video">
                <video ref={ref} src={state.url} preload="metadata" aria-label={label} {...handlers} />
              </div>
            ) : (
              <audio ref={ref} src={state.url} preload="metadata" aria-label={label} {...handlers} />
            )}
            <div className="media-preview__bar">
              <button
                type="button"
                className="media-preview__button"
                onClick={toggle}
                aria-label={playing ? 'השהה' : 'הפעל'}
              >
                {playing ? <PauseIcon /> : <PlayIcon />}
              </button>
              <span className="media-preview__duration" aria-label="משך">
                משך: <bdi>{duration === null ? '--:--' : formatDuration(duration)}</bdi>
              </span>
            </div>
          </div>
        </>
      )}
    </section>
  )
}
