import type { ComponentProps } from 'react'

export function EmptyState({ className = '', ...props }: ComponentProps<'p'>) {
  return <p {...props} className={`page-empty ui-empty-state ${className}`.trim()} />
}
