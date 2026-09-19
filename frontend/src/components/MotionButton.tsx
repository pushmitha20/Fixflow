import type { ButtonHTMLAttributes, ReactNode } from 'react'

type MotionButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode
  variant?: 'primary' | 'secondary'
  arrow?: boolean
}

export default function MotionButton({
  children,
  variant = 'secondary',
  arrow = false,
  className = '',
  ...props
}: MotionButtonProps) {
  return (
    <button
      type="button"
      className={`ff-motion-button ff-motion-button--${variant} ${className}`.trim()}
      {...props}
    >
      <span>{children}</span>
      {arrow ? <span aria-hidden="true" className="ff-motion-button__arrow">→</span> : null}
    </button>
  )
}
