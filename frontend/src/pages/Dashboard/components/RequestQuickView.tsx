import { useEffect, useRef } from 'react'
import type { MaintenanceRequest } from '../../../types/api'
import { formatStatus, getPriorityClass, getStatusClass } from './requestBadges'

type RequestQuickViewProps = {
  request: MaintenanceRequest
  onClose: () => void
}

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export default function RequestQuickView({ request, onClose }: RequestQuickViewProps) {
  const dialogRef = useRef<HTMLDivElement | null>(null)
  const closeButtonRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null
    const previousOverflow = document.body.style.overflow
    const previousPaddingRight = document.body.style.paddingRight
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth

    document.body.style.overflow = 'hidden'
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`
    }
    closeButtonRef.current?.focus()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }

      if (event.key !== 'Tab' || !dialogRef.current) {
        return
      }

      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (!first || !last) {
        event.preventDefault()
        return
      }

      const active = document.activeElement

      const focusIsOutside = !dialogRef.current.contains(active) || active === dialogRef.current

      if (event.shiftKey && (focusIsOutside || active === first)) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && (focusIsOutside || active === last)) {
        event.preventDefault()
        first.focus()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
      document.body.style.paddingRight = previousPaddingRight
      previouslyFocused?.focus()
    }
  }, [onClose])

  const titleId = `request-quick-view-title-${request.id}`
  const descriptionId = `request-quick-view-description-${request.id}`

  return (
    <div className="ff-modal-backdrop" onClick={onClose}>
      <div
        ref={dialogRef}
        className="ff-modal ff-modal--request"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="ff-modal__header ff-request-quick-view__header">
          <div>
            <p className="label">Request #{request.id}</p>
            <h2 id={titleId}>{request.title}</h2>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            className="ff-icon-button ff-request-quick-view__close"
            aria-label="Close request details"
            title="Close"
            onClick={onClose}
          >
            <svg
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.6"
              strokeLinecap="round"
              aria-hidden="true"
              focusable="false"
            >
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </header>

        <div className="ff-request-quick-view__body">
          <div className="ff-detail-badges">
            <span className={getPriorityClass(request.priority)}>{request.priority}</span>
            <span className={getStatusClass(request.status)}>{formatStatus(request.status)}</span>
          </div>

          <section className="ff-detail-section" aria-label="Description">
            <p className="label">Description</p>
            <p id={descriptionId}>{request.description || 'No description provided.'}</p>
          </section>

          <dl className="ff-detail-list">
            <div>
              <dt>Location</dt>
              <dd>{request.location}</dd>
            </div>
            <div>
              <dt>Priority</dt>
              <dd>{request.priority}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>{formatStatus(request.status)}</dd>
            </div>
            <div>
              <dt>Request ID</dt>
              <dd>#{request.id}</dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  )
}
