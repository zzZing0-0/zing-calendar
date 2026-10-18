import type { ReactNode } from 'react'

export interface PageHeadingProps {
  as?: 'div' | 'header'
  titleId?: string
  title: ReactNode
  eyebrow?: ReactNode
  actions?: ReactNode
  className?: string
}

export function PageHeading({ as: Root = 'div', title, titleId, eyebrow, actions, className = '' }: PageHeadingProps) {
  return <Root className={`page-heading ui-page-heading ${className}`.trim()}>
    <div>{eyebrow && <span className="eyebrow">{eyebrow}</span>}<h2 id={titleId}>{title}</h2></div>
    {actions}
  </Root>
}
