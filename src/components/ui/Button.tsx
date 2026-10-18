import type { ComponentProps } from 'react'

export type ButtonVariant = 'plain' | 'primary' | 'secondary' | 'danger'
export interface ButtonProps extends ComponentProps<'button'> {
  variant?: ButtonVariant
}

/** Native button semantics, including refs, keyboard activation and disabled state. */
export function Button({ variant = 'plain', className = '', type = 'button', ...props }: ButtonProps) {
  return <button {...props} type={type} className={`ui-button ${className}`.trim()} data-variant={variant} />
}
