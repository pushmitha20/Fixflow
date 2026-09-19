import {
  useEffect,
  useRef,
  type ElementType,
  type ReactNode,
} from 'react'
import { useReducedMotion } from '../hooks/useReducedMotion'

type RevealProps = {
  children: ReactNode
  as?: ElementType
  className?: string
  delay?: number
}

export default function Reveal({
  children,
  as: Component = 'div',
  className = '',
  delay = 0,
}: RevealProps) {
  const ref = useRef<HTMLElement | null>(null)
  const prefersReducedMotion = useReducedMotion()

  useEffect(() => {
    if (prefersReducedMotion || !ref.current) {
      return
    }

    const element = ref.current
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            element.classList.add('is-visible')
            observer.unobserve(element)
          }
        })
      },
      { threshold: 0.12 },
    )

    observer.observe(element)

    return () => observer.disconnect()
  }, [prefersReducedMotion])

  const Tag = Component as ElementType

  return (
    <Tag
      ref={ref}
      className={`ff-reveal ${className} ${prefersReducedMotion ? 'is-visible' : ''}`.trim()}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </Tag>
  )
}
