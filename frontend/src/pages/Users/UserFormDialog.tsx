import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import MotionButton from '../../components/MotionButton'
import { userService } from '../../services/userService'
import type { User, UserRole } from '../../types/api'
import { describeUserError, type UserFieldErrors } from './userErrors'
import { ROLE_ORDER, roleLabels } from './userRoles'

type UserFormDialogProps = {
  mode: 'create' | 'edit'
  user?: User
  onClose: () => void
  onSaved: (user: User) => void
  onMissing?: () => void
}

type UserForm = {
  name: string
  email: string
  role: UserRole | ''
}

// Mirrors only the obvious rules; the User Service remains the source of truth.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const validateForm = (values: UserForm): UserFieldErrors => {
  const errors: UserFieldErrors = {}
  const name = values.name.trim()
  const email = values.email.trim()

  if (!name) {
    errors.name = 'Name is required.'
  } else if (name.length < 2) {
    errors.name = 'Name must be at least 2 characters.'
  } else if (name.length > 100) {
    errors.name = 'Name must be 100 characters or fewer.'
  }

  if (!email) {
    errors.email = 'Email is required.'
  } else if (!EMAIL_PATTERN.test(email)) {
    errors.email = 'Enter a valid email address.'
  }

  if (!values.role) {
    errors.role = 'Role is required.'
  }

  return errors
}

export default function UserFormDialog({ mode, user, onClose, onSaved, onMissing }: UserFormDialogProps) {
  const [form, setForm] = useState<UserForm>(() =>
    user ? { name: user.name, email: user.email, role: user.role } : { name: '', email: '', role: '' },
  )
  const [errors, setErrors] = useState<UserFieldErrors>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const submitLockRef = useRef(false)
  const nameInputRef = useRef<HTMLInputElement | null>(null)
  const isEdit = mode === 'edit'

  const handleClose = useCallback(() => {
    if (!submitLockRef.current) {
      onClose()
    }
  }, [onClose])

  useEffect(() => {
    const focusTimer = window.setTimeout(() => nameInputRef.current?.focus(), 60)

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
  }, [handleClose])

  const updateField = <K extends keyof UserForm>(field: K, value: UserForm[K]) => {
    setForm((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (submitLockRef.current) {
      return
    }

    const nextErrors = validateForm(form)
    setErrors(nextErrors)

    if (Object.keys(nextErrors).length > 0 || !form.role) {
      return
    }

    submitLockRef.current = true
    setIsSubmitting(true)
    setSubmitError(null)

    const payload = { name: form.name.trim(), email: form.email.trim(), role: form.role }

    try {
      const saved =
        isEdit && user ? await userService.updateUser(user.id, payload) : await userService.createUser(payload)

      submitLockRef.current = false
      onSaved(saved)
    } catch (error) {
      const described = describeUserError(
        error,
        isEdit ? 'User could not be updated. Try again.' : 'User could not be created. Try again.',
      )

      setErrors(described.fieldErrors)
      setSubmitError(described.message)
      submitLockRef.current = false
      setIsSubmitting(false)

      if (described.status === 404) {
        onMissing?.()
      }
    }
  }

  const titleId = isEdit ? 'edit-user-title' : 'create-user-title'

  return (
    <div className="ff-modal-backdrop ff-modal-backdrop--over-drawer" onClick={handleClose}>
      <div
        className="ff-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="ff-modal__header">
          <div>
            <p className="label">{isEdit ? `Edit user #${user?.id}` : 'Create user'}</p>
            <h2 id={titleId}>{isEdit ? user?.name : 'New team member'}</h2>
          </div>
          <button
            type="button"
            className="ff-icon-button"
            aria-label={isEdit ? 'Close edit user form' : 'Close create user form'}
            onClick={handleClose}
          >
            x
          </button>
        </header>

        <form className="ff-create-request" onSubmit={handleSubmit} aria-busy={isSubmitting} noValidate>
          <div className="ff-form-row">
            <label htmlFor="user-form-name">Name</label>
            <input
              id="user-form-name"
              ref={nameInputRef}
              type="text"
              autoComplete="name"
              value={form.name}
              onChange={(event) => updateField('name', event.target.value)}
              aria-invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? 'user-form-name-error' : undefined}
            />
            {errors.name ? (
              <span className="ff-field-error" id="user-form-name-error">
                {errors.name}
              </span>
            ) : null}
          </div>

          <div className="ff-form-row">
            <label htmlFor="user-form-email">Email</label>
            <input
              id="user-form-email"
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={(event) => updateField('email', event.target.value)}
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? 'user-form-email-error' : undefined}
            />
            {errors.email ? (
              <span className="ff-field-error" id="user-form-email-error">
                {errors.email}
              </span>
            ) : null}
          </div>

          <div className="ff-form-row">
            <label htmlFor="user-form-role">Role</label>
            <select
              id="user-form-role"
              value={form.role}
              onChange={(event) => updateField('role', event.target.value as UserRole | '')}
              aria-invalid={Boolean(errors.role)}
              aria-describedby={errors.role ? 'user-form-role-error' : undefined}
            >
              <option value="" disabled>
                Select a role
              </option>
              {ROLE_ORDER.map((role) => (
                <option key={role} value={role}>
                  {roleLabels[role]}
                </option>
              ))}
            </select>
            {errors.role ? (
              <span className="ff-field-error" id="user-form-role-error">
                {errors.role}
              </span>
            ) : null}
          </div>

          {submitError ? (
            <div className="ff-form-status ff-form-status--error" role="alert">
              {submitError}
            </div>
          ) : null}

          <div className="ff-modal__actions">
            <button type="button" className="ff-secondary-button" onClick={handleClose} disabled={isSubmitting}>
              Cancel
            </button>
            <MotionButton type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? (isEdit ? 'Saving...' : 'Creating...') : isEdit ? 'Save changes' : 'Create user'}
            </MotionButton>
          </div>
        </form>
      </div>
    </div>
  )
}
