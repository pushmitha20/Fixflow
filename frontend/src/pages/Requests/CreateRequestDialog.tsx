import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import MotionButton from '../../components/MotionButton'
import { requestService } from '../../services/requestService'
import type { MaintenanceRequest, RequestPriority } from '../../types/api'

type CreateRequestDialogProps = {
  open: boolean
  onClose: () => void
  onCreated?: (request: MaintenanceRequest) => void
}

type CreateRequestForm = {
  title: string
  description: string
  location: string
  priority: RequestPriority
}

type CreateRequestErrors = Partial<Record<keyof CreateRequestForm, string>>

const emptyForm: CreateRequestForm = {
  title: '',
  description: '',
  location: '',
  priority: 'MEDIUM',
}

const priorityOptions: Array<{ label: string; value: RequestPriority }> = [
  { label: 'Low', value: 'LOW' },
  { label: 'Medium', value: 'MEDIUM' },
  { label: 'High', value: 'HIGH' },
]

const getConfiguredDemoUserId = () => {
  const configuredUserId = Number(import.meta.env.VITE_DEMO_USER_ID)

  if (!Number.isInteger(configuredUserId) || configuredUserId <= 0) {
    throw new Error('Create Request is missing a configured development user.')
  }

  return configuredUserId
}

const validateForm = (values: CreateRequestForm): CreateRequestErrors => {
  const nextErrors: CreateRequestErrors = {}
  const title = values.title.trim()
  const description = values.description.trim()
  const location = values.location.trim()

  if (!title) {
    nextErrors.title = 'Title is required.'
  } else if (title.length < 3) {
    nextErrors.title = 'Title must be at least 3 characters.'
  }

  if (!description) {
    nextErrors.description = 'Description is required.'
  } else if (description.length < 5) {
    nextErrors.description = 'Description must be at least 5 characters.'
  }

  if (!location) {
    nextErrors.location = 'Location is required.'
  } else if (location.length < 2) {
    nextErrors.location = 'Location must be at least 2 characters.'
  }

  if (!['LOW', 'MEDIUM', 'HIGH'].includes(values.priority)) {
    nextErrors.priority = 'Priority must be LOW, MEDIUM, or HIGH.'
  }

  return nextErrors
}

export default function CreateRequestDialog({
  open,
  onClose,
  onCreated,
}: CreateRequestDialogProps) {
  const [form, setForm] = useState<CreateRequestForm>(emptyForm)
  const [errors, setErrors] = useState<CreateRequestErrors>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const titleInputRef = useRef<HTMLInputElement | null>(null)

  const resetFormState = useCallback(() => {
    setForm(emptyForm)
    setErrors({})
    setSubmitError(null)
    setIsSubmitting(false)
  }, [])

  const handleClose = useCallback(() => {
    if (isSubmitting) {
      return
    }

    resetFormState()
    onClose()
  }, [isSubmitting, onClose, resetFormState])

  useEffect(() => {
    if (!open) {
      return
    }

    const focusTimer = window.setTimeout(() => {
      titleInputRef.current?.focus()
    }, 60)

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleClose()
      }
    }

    window.addEventListener('keydown', handleEscape)

    return () => {
      window.clearTimeout(focusTimer)
      window.removeEventListener('keydown', handleEscape)
    }
  }, [handleClose, open])

  const updateField = <K extends keyof CreateRequestForm>(field: K, value: CreateRequestForm[K]) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }))

    setErrors((current) => ({
      ...current,
      [field]: undefined,
    }))
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (isSubmitting) {
      return
    }

    const nextErrors = validateForm(form)
    setErrors(nextErrors)

    if (Object.keys(nextErrors).length > 0) {
      return
    }

    setIsSubmitting(true)
    setSubmitError(null)

    try {
      const createdRequest = await requestService.createRequest({
        // Temporary until authentication/current-user context supplies this value.
        user_id: getConfiguredDemoUserId(),
        title: form.title.trim(),
        description: form.description.trim(),
        location: form.location.trim(),
        priority: form.priority,
      })

      onCreated?.(createdRequest)
      resetFormState()
      onClose()
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : 'Request could not be created. Check the gateway connection and try again.'

      setSubmitError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!open) {
    return null
  }

  return (
    <div className="ff-modal-backdrop" onClick={handleClose}>
      <div
        className="ff-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-request-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="ff-modal__header">
          <div>
            <p className="label">Create request</p>
            <h2 id="new-request-title">New maintenance request</h2>
          </div>
          <button
            type="button"
            className="ff-icon-button"
            aria-label="Close create request form"
            onClick={handleClose}
          >
            x
          </button>
        </header>

        <form className="ff-create-request" onSubmit={handleSubmit} aria-busy={isSubmitting}>
          <div className="ff-form-row">
            <label htmlFor="request-title">Title</label>
            <input
              id="request-title"
              ref={titleInputRef}
              type="text"
              value={form.title}
              onChange={(event) => updateField('title', event.target.value)}
              placeholder="e.g. Replace HVAC filter"
              aria-invalid={Boolean(errors.title)}
            />
            {errors.title ? <span className="ff-field-error">{errors.title}</span> : null}
          </div>

          <div className="ff-form-row">
            <label htmlFor="request-description">Description</label>
            <textarea
              id="request-description"
              value={form.description}
              onChange={(event) => updateField('description', event.target.value)}
              placeholder="Describe the issue and any immediate impact."
              rows={5}
              aria-invalid={Boolean(errors.description)}
            />
            {errors.description ? <span className="ff-field-error">{errors.description}</span> : null}
          </div>

          <div className="ff-form-row">
            <label htmlFor="request-location">Location</label>
            <input
              id="request-location"
              type="text"
              value={form.location}
              onChange={(event) => updateField('location', event.target.value)}
              placeholder="e.g. Building A / Floor 2"
              aria-invalid={Boolean(errors.location)}
            />
            {errors.location ? <span className="ff-field-error">{errors.location}</span> : null}
          </div>

          <div className="ff-form-row">
            <label>Priority</label>
            <div className="ff-priority-options" role="radiogroup" aria-label="Request priority">
              {priorityOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={form.priority === option.value ? 'is-selected' : ''}
                  onClick={() => updateField('priority', option.value)}
                  aria-pressed={form.priority === option.value}
                >
                  {option.label}
                </button>
              ))}
            </div>
            {errors.priority ? <span className="ff-field-error">{errors.priority}</span> : null}
          </div>

          {submitError ? (
            <div className="ff-form-status ff-form-status--error" role="alert">
              {submitError}
            </div>
          ) : null}

          <div className="ff-modal__actions">
            <button type="button" className="ff-secondary-button" onClick={handleClose}>
              Cancel
            </button>
            <MotionButton type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create request'}
            </MotionButton>
          </div>
        </form>
      </div>
    </div>
  )
}
