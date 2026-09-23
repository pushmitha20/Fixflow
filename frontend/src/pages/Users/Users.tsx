import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import AppLayout from '../../components/layout/AppLayout'
import MotionButton from '../../components/MotionButton'
import Reveal from '../../components/Reveal'
import { userService } from '../../services/userService'
import type { User, UserRole } from '../../types/api'
import DeleteUserDialog from './DeleteUserDialog'
import UserFormDialog from './UserFormDialog'
import { MISSING_USER_MESSAGE, describeUserError } from './userErrors'
import { ROLE_ORDER, roleLabels } from './userRoles'

type UsersProps = {
  onNavigate?: (item: string) => void
}

type RoleFilter = 'ALL' | UserRole

type DialogState = { type: 'create' } | { type: 'edit'; user: User } | { type: 'delete'; user: User } | null

type DetailState = {
  user: User
  status: 'ready' | 'missing' | 'stale'
}

const byNameThenId = (a: User, b: User) =>
  a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }) || a.id - b.id

const focusElement = (element: HTMLElement | null) => {
  if (element?.isConnected) {
    element.focus()
    return true
  }

  return false
}

export default function Users({ onNavigate }: UsersProps) {
  const [users, setUsers] = useState<User[] | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('ALL')
  const [detail, setDetail] = useState<DetailState | null>(null)
  const [dialog, setDialog] = useState<DialogState>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [highlightId, setHighlightId] = useState<number | null>(null)
  const drawerReturnRef = useRef<HTMLElement | null>(null)
  const dialogReturnRef = useRef<HTMLElement | null>(null)
  const listHeadingRef = useRef<HTMLHeadingElement | null>(null)

  useEffect(() => {
    let isActive = true

    userService
      .getUsers()
      .then((result) => {
        if (isActive) {
          setUsers(result)
        }
      })
      .catch((error) => {
        if (isActive) {
          setLoadError(describeUserError(error, 'Users could not be loaded. Try again.').message)
        }
      })
      .finally(() => {
        if (isActive) {
          setIsLoading(false)
        }
      })

    return () => {
      isActive = false
    }
  }, [])

  const retryLoad = async () => {
    setIsLoading(true)
    setLoadError(null)

    try {
      setUsers(await userService.getUsers())
    } catch (error) {
      setLoadError(describeUserError(error, 'Users could not be loaded. Try again.').message)
    } finally {
      setIsLoading(false)
    }
  }

  // Used after the backend reports a user missing, so the list reflects real state.
  const resyncUsers = useCallback(async () => {
    try {
      setUsers(await userService.getUsers())
    } catch {
      // The visible list stays as last loaded; the dialog already shows the real error.
    }
  }, [])

  const sortedUsers = useMemo(() => [...(users ?? [])].sort(byNameThenId), [users])

  const roleCounts = useMemo(() => {
    const counts: Record<UserRole, number> = { STUDENT: 0, TECHNICIAN: 0, ADMIN: 0 }
    sortedUsers.forEach((user) => {
      counts[user.role] = (counts[user.role] ?? 0) + 1
    })
    return counts
  }, [sortedUsers])

  const filteredUsers = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase().replace(/^#/, '')

    return sortedUsers.filter((user) => {
      if (roleFilter !== 'ALL' && user.role !== roleFilter) {
        return false
      }

      if (!normalizedSearch) {
        return true
      }

      return [String(user.id), user.name, user.email, user.role, roleLabels[user.role]].some((value) =>
        value.toLowerCase().includes(normalizedSearch),
      )
    })
  }, [sortedUsers, searchTerm, roleFilter])

  const totalCount = sortedUsers.length
  const hasActiveFilters = searchTerm.trim().length > 0 || roleFilter !== 'ALL'
  const resultLabel = hasActiveFilters
    ? `${filteredUsers.length} of ${totalCount} users`
    : `${totalCount} ${totalCount === 1 ? 'user' : 'users'}`

  const clearFilters = () => {
    setSearchTerm('')
    setRoleFilter('ALL')
  }

  const openDetails = (user: User, trigger: HTMLElement) => {
    drawerReturnRef.current = trigger
    setDetail({ user, status: 'ready' })

    userService
      .getUser(user.id)
      .then((fresh) => setDetail((current) => (current?.user.id === fresh.id ? { user: fresh, status: 'ready' } : current)))
      .catch((error) => {
        const missing = describeUserError(error, '').status === 404
        setDetail((current) =>
          current?.user.id === user.id ? { user: current.user, status: missing ? 'missing' : 'stale' } : current,
        )

        if (missing) {
          void resyncUsers()
        }
      })
  }

  const closeDetails = useCallback(() => {
    setDetail(null)
    if (!focusElement(drawerReturnRef.current)) {
      listHeadingRef.current?.focus()
    }
  }, [])

  const openDialog = (next: NonNullable<DialogState>, trigger: HTMLElement | null) => {
    dialogReturnRef.current = trigger
    setNotice(null)
    setDialog(next)
  }

  const closeDialog = useCallback(() => {
    setDialog(null)
    window.setTimeout(() => {
      if (!focusElement(dialogReturnRef.current)) {
        listHeadingRef.current?.focus()
      }
    }, 0)
  }, [])

  const handleCreated = (created: User) => {
    setUsers((current) => [...(current ?? []), created])
    clearFilters()
    setHighlightId(created.id)
    setNotice(`Created ${created.name} (#${created.id}).`)
    closeDialog()
  }

  const handleUpdated = (updated: User) => {
    setUsers((current) => (current ?? []).map((user) => (user.id === updated.id ? updated : user)))
    setDetail((current) => (current?.user.id === updated.id ? { user: updated, status: 'ready' } : current))
    setHighlightId(updated.id)
    setNotice(`Saved changes to ${updated.name} (#${updated.id}).`)
    closeDialog()
  }

  const handleDeleted = (deleted: User) => {
    setUsers((current) => (current ?? []).filter((user) => user.id !== deleted.id))
    setDetail((current) => (current?.user.id === deleted.id ? null : current))
    setHighlightId(null)
    setNotice(`Deleted ${deleted.name} (#${deleted.id}).`)
    dialogReturnRef.current = null
    closeDialog()
  }

  return (
    <AppLayout title="Users" subtitle="Team management" onNavigate={onNavigate}>
      <div className="ff-requests ff-users">
        <Reveal as="header" className="ff-requests__intro" delay={40}>
          <div>
            <p className="label">Team</p>
            <h1>Manage the people who can access FixFlow.</h1>
          </div>
          <MotionButton
            variant="primary"
            arrow
            onClick={(event) => openDialog({ type: 'create' }, event.currentTarget)}
            disabled={isLoading || Boolean(loadError)}
          >
            Create User
          </MotionButton>
        </Reveal>

        {notice ? (
          <div className="ff-form-status ff-form-status--success" role="status">
            {notice}
          </div>
        ) : null}

        {!isLoading && !loadError ? (
          <Reveal delay={60}>
            <section className="ff-metric-strip ff-users__summary" aria-label="User summary">
              <div className="ff-metric brand">
                <span className="label">Total users</span>
                <strong>{totalCount}</strong>
              </div>
              {ROLE_ORDER.map((role) => (
                <div className="ff-metric" key={role}>
                  <span className="label">{roleLabels[role]}s</span>
                  <strong>{roleCounts[role]}</strong>
                </div>
              ))}
            </section>
          </Reveal>
        ) : null}

        <Reveal className="ff-requests__workspace" delay={80}>
          <section className="ff-requests__toolbar" aria-label="User filters">
            <div className="ff-requests__search">
              <label htmlFor="user-search">Search users</label>
              <input
                id="user-search"
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Name, email, role, or ID"
              />
            </div>

            <div className="ff-filter-group" role="group" aria-labelledby="user-role-filter">
              <span id="user-role-filter">Role</span>
              <div className="ff-filter-group__options">
                {(['ALL', ...ROLE_ORDER] as RoleFilter[]).map((option) => (
                  <button
                    key={option}
                    type="button"
                    className={roleFilter === option ? 'is-active' : ''}
                    onClick={() => setRoleFilter(option)}
                    aria-pressed={roleFilter === option}
                  >
                    {option === 'ALL' ? 'All' : roleLabels[option]} ·{' '}
                    {option === 'ALL' ? totalCount : roleCounts[option]}
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section className="ff-requests__list" aria-labelledby="users-list-heading">
            <div className="ff-requests__list-head">
              <div>
                <p className="label">Directory</p>
                <h2 id="users-list-heading" ref={listHeadingRef} tabIndex={-1}>
                  Users
                </h2>
              </div>
              <span aria-live="polite">{isLoading ? 'Loading users' : loadError ? '' : resultLabel}</span>
            </div>

            {isLoading ? <UsersLoading /> : null}

            {!isLoading && loadError ? (
              <div className="ff-requests-state" role="alert">
                <p className="label">Connection issue</p>
                <h3>Unable to load users</h3>
                <p>{loadError}</p>
                <MotionButton onClick={retryLoad}>Retry</MotionButton>
              </div>
            ) : null}

            {!isLoading && !loadError && totalCount === 0 ? (
              <div className="ff-requests-state">
                <p className="label">No users</p>
                <h3>No one has been added yet</h3>
                <p>Create the first user to give them access to FixFlow.</p>
              </div>
            ) : null}

            {!isLoading && !loadError && totalCount > 0 && filteredUsers.length === 0 ? (
              <div className="ff-requests-state">
                <p className="label">No matches</p>
                <h3>No users match your current filters.</h3>
                <p>Adjust the search or role selection to widen the view.</p>
                <MotionButton onClick={clearFilters}>Clear filters</MotionButton>
              </div>
            ) : null}

            {!isLoading && !loadError && filteredUsers.length > 0 ? (
              <div className="ff-user-table">
                <div className="ff-user-table__header" aria-hidden="true">
                  <span className="ff-user-row__columns">
                    <span>ID</span>
                    <span>Name</span>
                    <span>Email</span>
                    <span>Role</span>
                  </span>
                  <span className="ff-user-table__actions-head">Actions</span>
                </div>
                <ul className="ff-user-table__body" aria-label="Users">
                  {filteredUsers.map((user) => (
                    <li
                      key={user.id}
                      className={`ff-user-row ${detail?.user.id === user.id || highlightId === user.id ? 'is-selected' : ''}`}
                    >
                      <button
                        type="button"
                        className="ff-user-row__columns ff-user-row__main"
                        aria-haspopup="dialog"
                        aria-label={`View ${user.name}, ${roleLabels[user.role]}, ${user.email}`}
                        onClick={(event) => openDetails(user, event.currentTarget)}
                      >
                        <span className="ff-user-row__id">#{user.id}</span>
                        <span className="ff-user-row__name">{user.name}</span>
                        <span className="ff-user-row__email">{user.email}</span>
                        <span>
                          <span className="ff-role-tag">{roleLabels[user.role]}</span>
                        </span>
                      </button>
                      <div className="ff-user-row__actions">
                        <button
                          type="button"
                          className="ff-secondary-button"
                          aria-label={`Edit ${user.name}`}
                          onClick={(event) => openDialog({ type: 'edit', user }, event.currentTarget)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="ff-danger-button"
                          aria-label={`Delete ${user.name}`}
                          onClick={(event) => openDialog({ type: 'delete', user }, event.currentTarget)}
                        >
                          Delete
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>
        </Reveal>
      </div>

      {detail ? (
        <UserDetailsDrawer
          detail={detail}
          suspended={dialog !== null}
          onClose={closeDetails}
          onEdit={(trigger) => openDialog({ type: 'edit', user: detail.user }, trigger)}
          onDelete={(trigger) => openDialog({ type: 'delete', user: detail.user }, trigger)}
        />
      ) : null}

      {dialog?.type === 'create' ? (
        <UserFormDialog mode="create" onClose={closeDialog} onSaved={handleCreated} />
      ) : null}

      {dialog?.type === 'edit' ? (
        <UserFormDialog
          mode="edit"
          user={dialog.user}
          onClose={closeDialog}
          onSaved={handleUpdated}
          onMissing={() => {
            setDetail((current) =>
              current?.user.id === dialog.user.id ? { user: current.user, status: 'missing' } : current,
            )
            void resyncUsers()
          }}
        />
      ) : null}

      {dialog?.type === 'delete' ? (
        <DeleteUserDialog
          user={dialog.user}
          onClose={closeDialog}
          onDeleted={handleDeleted}
          onMissing={() => {
            setDetail((current) =>
              current?.user.id === dialog.user.id ? { user: current.user, status: 'missing' } : current,
            )
            void resyncUsers()
          }}
        />
      ) : null}
    </AppLayout>
  )
}

type UserDetailsDrawerProps = {
  detail: DetailState
  suspended: boolean
  onClose: () => void
  onEdit: (trigger: HTMLElement) => void
  onDelete: (trigger: HTMLElement) => void
}

function UserDetailsDrawer({ detail, suspended, onClose, onEdit, onDelete }: UserDetailsDrawerProps) {
  const closeButtonRef = useRef<HTMLButtonElement | null>(null)
  const { user, status } = detail
  const isMissing = status === 'missing'

  useEffect(() => {
    const focusTimer = window.setTimeout(() => closeButtonRef.current?.focus(), 60)
    return () => window.clearTimeout(focusTimer)
  }, [])

  useEffect(() => {
    if (suspended) {
      return undefined
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [onClose, suspended])

  return (
    <div className="ff-details-backdrop" onClick={suspended ? undefined : onClose}>
      <aside
        className="ff-details-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="user-details-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="ff-details-drawer__header">
          <div>
            <p className="label">User details</p>
            <h2 id="user-details-title">{user.name}</h2>
          </div>
          <div className="ff-details-drawer__actions">
            {!isMissing ? (
              <>
                <MotionButton className="ff-detail-edit-button" onClick={(event) => onEdit(event.currentTarget)}>
                  Edit
                </MotionButton>
                <button
                  type="button"
                  className="ff-detail-delete-button"
                  aria-label={`Delete ${user.name}`}
                  onClick={(event) => onDelete(event.currentTarget)}
                >
                  Delete
                </button>
              </>
            ) : null}
            <button
              ref={closeButtonRef}
              type="button"
              className="ff-icon-button"
              aria-label="Close user details"
              onClick={onClose}
            >
              x
            </button>
          </div>
        </header>

        <div className="ff-details-drawer__body">
          {isMissing ? (
            <div className="ff-detail-state" role="alert">
              <p className="label">Not found</p>
              <h3>User unavailable</h3>
              <p>{MISSING_USER_MESSAGE}</p>
            </div>
          ) : null}

          {status === 'stale' ? (
            <div className="ff-form-status ff-form-status--error" role="status">
              Latest details could not be loaded. Showing the values from the user list.
            </div>
          ) : null}

          <dl className="ff-detail-list">
            <div>
              <dt>User ID</dt>
              <dd>#{user.id}</dd>
            </div>
            <div>
              <dt>Name</dt>
              <dd>{user.name}</dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd className="ff-user-detail__email">{user.email}</dd>
            </div>
            <div>
              <dt>Role</dt>
              <dd>{roleLabels[user.role]}</dd>
            </div>
          </dl>
        </div>
      </aside>
    </div>
  )
}

function UsersLoading() {
  return (
    <div className="ff-request-loading" aria-hidden="true">
      {Array.from({ length: 4 }, (_, index) => (
        <div className="ff-user-skeleton" key={index}>
          <span />
          <span />
          <span />
          <span />
        </div>
      ))}
    </div>
  )
}
