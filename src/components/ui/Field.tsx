import type { ComponentProps } from 'react'

/** A native label: nesting, htmlFor and accessible control names remain intact. */
export function Field({ className = '', ...props }: ComponentProps<'label'>) {
  return <label {...props} className={`ui-field ${className}`.trim()} />
}
