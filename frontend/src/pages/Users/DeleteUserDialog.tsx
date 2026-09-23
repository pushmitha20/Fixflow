import { useCallback, useEffect, useRef, useState } from 'react'
import { userService } from '../../services/userService'
import type { User } from '../../types/api'
import { describeUserError } from './userErrors'

type DeleteUserDialogProps = {
  user: User
  onClose: () => void
  onDeleted: (user: User) => void
  onMissing?: () => void
}

export default function DeleteUserDialog({ user, onClose, onDeleted, onMissing }: DeleteUserDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const deleteLockRef = useRef(false)
  const cancelButtonRef = useRef<HTMLButtonElement | null>(null)

  const handleClose = useCallback(() => {
    if (!deleteLockRef.current) {
      onClose()
    }
  }, [onClose])

  useEffect(() => {
    const focusTimer = window.setTimeout(() => cancelButtonRef.current?.focus(), 60)

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

  const handleDelete = async () => {
    if (deleteLockRef.current) {
      return
    }

    deleteLockRef.current = true
    setIsDeleting(true)
    setError(null)

    try {
      await userService.deleteUser(user.id)
      deleteLockRef.current = false
      onDeleted(user)
    } catch (deleteError) {
      const described = describeUserError(deleteError, 'User could not be deleted. Try again.')

      setError(described.message)
      deleteLockRef.current = false
      setIsDeleting(false)

      if (described.status === 404) {
        onMissing?.()
      }
    }
  }

  return (
    <div className="ff-modal-backdrop ff-modal-backdrop--over-drawer" onClick={handleClose}>
      <div
        className="ff-modal ff-modal--compact"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-user-title"
        aria-describedby="delete-user-description"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="ff-detail-delete-confirmation">
          <p className="label">Delete user #{user.id}</p>
          <h2 id="delete-user-title">Delete "{user.name}"?</h2>
          <p id="delete-user-description">
            {user.email} will be removed from FixFlow. This action cannot be undone.
          </p>

          {error ? (
            <div className="ff-form-status ff-form-status--error" role="alert">
              {error}
            </div>
          ) : null}

          <div className="ff-modal__actions">
            <button
              ref={cancelButtonRef}
              type="button"
              className="ff-secondary-button"
              onClick={handleClose}
              disabled={isDeleting}
            >
              Cancel
            </button>
            <button type="button" className="ff-danger-button" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? 'Deleting...' : 'Delete user'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
