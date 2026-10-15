import type { ReactNode } from 'react'

export function EmptyState({
  title,
  detail,
  tone = 'neutral',
  children,
}: {
  title: string
  detail?: string
  tone?: 'neutral' | 'error'
  children?: ReactNode
}) {
  return (
    <div className={tone === 'error' ? 'empty empty--error' : 'empty'} role={tone === 'error' ? 'alert' : undefined}>
      <p className="empty__title">{title}</p>
      {detail && <p className="empty__detail">{detail}</p>}
      {children}
    </div>
  )
}
