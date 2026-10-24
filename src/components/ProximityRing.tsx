import type { ReactNode } from 'react'

const SIZE = 38
const STROKE = 2.5
const RADIUS = (SIZE - STROKE) / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

/** טבעת קרבה (UX-DR9): קשת שמתחילה מלמעלה סביב האייקון, תג מספר בתחתית, והמספר גם ב-tooltip וב-aria. */
export function ProximityRing({ score, children }: { score: number; children: ReactNode }) {
  const value = Math.min(Math.max(Math.round(score), 0), 100)
  const label = `קרבה ${value} אחוז`
  return (
    <span className="ring" role="img" aria-label={label} title={label}>
      <svg className="ring__svg" width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden="true">
        <circle className="ring__track" cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" strokeWidth={STROKE} />
        <circle
          className="ring__fill"
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          strokeWidth={STROKE}
          strokeDasharray={`${(CIRCUMFERENCE * value) / 100} ${CIRCUMFERENCE}`}
          transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
        />
      </svg>
      <span className="ring__icon">{children}</span>
      <span className="ring__badge tabular" aria-hidden="true">
        {value}
      </span>
    </span>
  )
}
