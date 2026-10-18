import type { ReactNode } from 'react'

export interface DialogHeaderProps {
  as?: 'div' | 'header'
  titleId?: string
  title: ReactNode
  eyebrow?: ReactNode
  actions?: ReactNode
  className?: string
}

/** The caller retains its close action, so domain-specific dismissal stays local. */
export function DialogHeader({ as: Root = 'div', title, titleId, eyebrow, actions, className = '' }: DialogHeaderProps) {
  return <Root className={`editor-header ui-dialog-header ${className}`.trim()}>
    <div>{eyebrow && <span className="eyebrow">{eyebrow}</span>}<h2 id={titleId}>{title}</h2></div>
    {actions}
  </Root>
}
