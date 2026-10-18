import type { ReactNode } from 'react'
import { Button } from './Button'

/** Shared focus presentation only; timer state and persistence stay with each feature. */
export function FocusCard({ title = '专注', duration, onHistory, children, className = '' }: {
  title?: string
  duration: string
  onHistory: () => void
  children: ReactNode
  className?: string
}) {
  return <section className={`ui-focus-card ${className}`.trim()} aria-label={title}>
    <div className="ui-focus-card-heading"><strong>{title}</strong><Button type="button" className="ui-focus-card-history" onClick={onHistory}>{duration} · 历史 ›</Button></div>
    <div className="ui-focus-card-content">{children}</div>
  </section>
}
