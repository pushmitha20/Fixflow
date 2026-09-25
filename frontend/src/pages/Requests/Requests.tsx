import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import AppLayout from '../../components/layout/AppLayout'
import MotionButton from '../../components/MotionButton'
import Reveal from '../../components/Reveal'
import { requestService } from '../../services/requestService'
import type {
  MaintenanceRequest,
  RequestPriority,
  RequestStatus,
  UpdateMaintenanceRequest,
} from '../../types/api'
import CreateRequestDialog from './CreateRequestDialog'

type RequestsProps = {
  onNavigate?: (item: string) => void
  initialPriority?: RequestPriority | null
}

type StatusFilter = RequestStatus | 'ALL'
type PriorityFilter = RequestPriority | 'ALL'
type RequestEditForm = UpdateMaintenanceRequest
type RequestEditErrors = Partial<Record<keyof RequestEditForm, string>>

const statusOptions: Array<{ label: string; value: StatusFilter }> = [
  { label: 'All', value: 'ALL' },
  { label: 'Open', value: 'OPEN' },
  { label: 'In Progress', value: 'IN_PROGRESS' },
  { label: 'Resolved', value: 'RESOLVED' },
  { label: 'Closed', value: 'CLOSED' },
]

const priorityOptions: Array<{ label: string; value: PriorityFilter }> = [
  { label: 'All', value: 'ALL' },
  { label: 'High', value: 'HIGH' },
  { label: 'Medium', value: 'MEDIUM' },
  { label: 'Low', value: 'LOW' },
]

const editableStatusOptions: Array<{ label: string; value: RequestStatus }> = [
  { label: 'Open', value: 'OPEN' },
  { label: 'In Progress', value: 'IN_PROGRESS' },
  { label: 'Resolved', value: 'RESOLVED' },
  { label: 'Closed', value: 'CLOSED' },
]

const editablePriorityOptions: Array<{ label: string; value: RequestPriority }> = [
  { label: 'High', value: 'HIGH' },
  { label: 'Medium', value: 'MEDIUM' },
  { label: 'Low', value: 'LOW' },
]

const statusLabels: Record<RequestStatus, string> = {
  OPEN: 'Open',
  IN_PROGRESS: 'In Progress',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
}

const priorityLabels: Record<RequestPriority, string> = {
  HIGH: 'High',
  MEDIUM: 'Medium',
  LOW: 'Low',
}

const statusClassNames: Record<RequestStatus, string> = {
  OPEN: 'ff-status--open',
  IN_PROGRESS: 'ff-status--in-progress',
  RESOLVED: 'ff-status--completed',
  CLOSED: 'ff-status--closed',
}

const priorityClassNames: Record<RequestPriority, string> = {
  HIGH: 'ff-priority--high',
  MEDIUM: 'ff-priority--medium',
  LOW: 'ff-priority--low',
}

const formatOptionalDateTime = (value?: string) => {
  if (!value) {
    return null
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return null
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

const isRequestPriority = (value: string): value is RequestPriority =>
  editablePriorityOptions.some((option) => option.value === value)

const isRequestStatus = (value: string): value is RequestStatus =>
  editableStatusOptions.some((option) => option.value === value)

const createEditForm = (request: MaintenanceRequest): RequestEditForm => ({
  title: request.title,
  description: request.description,
  location: request.location,
  priority: request.priority,
  status: request.status,
})

const validateEditForm = (form: RequestEditForm) => {
  const errors: RequestEditErrors = {}

  if (!form.title.trim()) {
    errors.title = 'Title is required.'
  }

  if (!form.description.trim()) {
    errors.description = 'Description is required.'
  }

  if (!form.location.trim()) {
    errors.location = 'Location is required.'
  }

  if (!isRequestPriority(form.priority)) {
    errors.priority = 'Choose a valid priority.'
  }

  if (!isRequestStatus(form.status)) {
    errors.status = 'Choose a valid status.'
  }

  return errors
}

export default function Requests({ onNavigate, initialPriority = null }: RequestsProps) {
  const [requests, setRequests] = useState<MaintenanceRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>(initialPriority ?? 'ALL')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [selectedRequestId, setSelectedRequestId] = useState<number | null>(null)
  const [detailRequest, setDetailRequest] = useState<MaintenanceRequest | null>(null)
  const [isDetailLoading, setIsDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)
  const [detailSuccessMessage, setDetailSuccessMessage] = useState<string | null>(null)

  const isDetailOpen = selectedRequestId !== null

  const loadRequests = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const data = await requestService.getRequests()
      setRequests(data)
    } catch {
      setError('Requests could not be loaded. Check the gateway connection and try again.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    requestService.getRequests()
      .then((data) => {
        setRequests(data)
      })
      .catch(() => {
        setError('Requests could not be loaded. Check the gateway connection and try again.')
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [])

  const filteredRequests = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase()

    return requests.filter((request) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        request.title.toLowerCase().includes(normalizedSearch) ||
        request.location.toLowerCase().includes(normalizedSearch) ||
        request.description.toLowerCase().includes(normalizedSearch)

      const matchesStatus =
        statusFilter === 'ALL' || request.status === statusFilter
      const matchesPriority =
        priorityFilter === 'ALL' || request.priority === priorityFilter

      return matchesSearch && matchesStatus && matchesPriority
    }).sort((a, b) => b.id - a.id)
  }, [priorityFilter, requests, searchTerm, statusFilter])

  const hasActiveFilters =
    searchTerm.trim().length > 0 ||
    statusFilter !== 'ALL' ||
    priorityFilter !== 'ALL'

  const resultLabel = hasActiveFilters
    ? `${filteredRequests.length} of ${requests.length} requests`
    : `${requests.length} ${requests.length === 1 ? 'request' : 'requests'}`

  const clearFilters = () => {
    setSearchTerm('')
    setStatusFilter('ALL')
    setPriorityFilter('ALL')
  }

  const loadRequestDetails = useCallback(async (requestId: number) => {
    setIsDetailLoading(true)
    setDetailError(null)
    setDetailSuccessMessage(null)
    setDetailRequest(null)

    try {
      const data = await requestService.getRequest(requestId)
      setDetailRequest(data)
    } catch {
      setDetailError('Request details could not be loaded. Check the gateway connection and try again.')
    } finally {
      setIsDetailLoading(false)
    }
  }, [])

  const handleSelectRequest = (requestId: number) => {
    setSelectedRequestId(requestId)
    setDetailSuccessMessage(null)
  }

  const handleCloseDetails = useCallback(() => {
    setSelectedRequestId(null)
    setDetailRequest(null)
    setDetailError(null)
    setDetailSuccessMessage(null)
    setIsDetailLoading(false)
  }, [])

  const handleRequestCreated = (createdRequest: MaintenanceRequest) => {
    setRequests((current) => [createdRequest, ...current])
    setError(null)
    setSuccessMessage(`Request "${createdRequest.title}" was created successfully.`)
  }

  const handleRequestUpdated = (updatedRequest: MaintenanceRequest) => {
    setRequests((current) =>
      current.map((request) =>
        request.id === updatedRequest.id ? updatedRequest : request,
      ),
    )
    setDetailRequest(updatedRequest)
    setDetailError(null)
    setDetailSuccessMessage(`Request "${updatedRequest.title}" was updated successfully.`)
  }

  const handleRequestDeleted = (requestId: number, title: string) => {
    setRequests((current) =>
      current.filter((request) => request.id !== requestId),
    )
    setSelectedRequestId(null)
    setDetailRequest(null)
    setDetailError(null)
    setDetailSuccessMessage(null)
    setSuccessMessage(`Request "${title}" was deleted successfully.`)
  }

  useEffect(() => {
    if (!successMessage) {
      return undefined
    }

    const timeoutId = window.setTimeout(() => {
      setSuccessMessage(null)
    }, 3000)

    return () => window.clearTimeout(timeoutId)
  }, [successMessage])

  useEffect(() => {
    if (selectedRequestId === null) {
      return undefined
    }

    let isCurrent = true

    const loadSelectedRequest = async () => {
      setIsDetailLoading(true)
      setDetailError(null)
      setDetailRequest(null)

      try {
        const data = await requestService.getRequest(selectedRequestId)

        if (isCurrent) {
          setDetailRequest(data)
        }
      } catch {
        if (isCurrent) {
          setDetailError('Request details could not be loaded. Check the gateway connection and try again.')
        }
      } finally {
        if (isCurrent) {
          setIsDetailLoading(false)
        }
      }
    }

    loadSelectedRequest()

    return () => {
      isCurrent = false
    }
  }, [selectedRequestId])

  return (
    <AppLayout title="Requests" subtitle="" onNavigate={onNavigate}>
      <div className="ff-requests">
        <Reveal as="header" className="ff-requests__intro ff-requests__intro--top" delay={40}>
          <div>
            <h1>Track, prioritize, and manage maintenance requests across facilities.</h1>
          </div>
          <MotionButton variant="primary" arrow onClick={() => setIsCreateOpen(true)}>
            New Request
          </MotionButton>
        </Reveal>

        {successMessage ? (
          <div className="ff-form-status ff-form-status--success" role="status">
            {successMessage}
          </div>
        ) : null}

        <Reveal className="ff-requests__workspace" delay={80}>
          <section className="ff-requests__toolbar" aria-label="Request filters">
            <div className="ff-requests__search">
              <label htmlFor="request-search">Search requests</label>
              <input
                id="request-search"
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search title, location, or description"
              />
            </div>

            <div className="ff-filter-group" aria-label="Filter by status">
              <span>Status</span>
              <div className="ff-filter-group__options">
                {statusOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={statusFilter === option.value ? 'is-active' : ''}
                    onClick={() => setStatusFilter(option.value)}
                    aria-pressed={statusFilter === option.value}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="ff-filter-group" aria-label="Filter by priority">
              <span>Priority</span>
              <div className="ff-filter-group__options">
                {priorityOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={priorityFilter === option.value ? 'is-active' : ''}
                    onClick={() => setPriorityFilter(option.value)}
                    aria-pressed={priorityFilter === option.value}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section className="ff-requests__list" aria-labelledby="requests-list-heading">
            <div className="ff-requests__list-head">
              <div>
                <p className="label">Live queue</p>
                <h2 id="requests-list-heading">Requests</h2>
              </div>
              <span>{isLoading ? 'Loading requests' : resultLabel}</span>
            </div>

            {isLoading ? <RequestsLoading /> : null}

            {!isLoading && error ? (
              <div className="ff-requests-state" role="alert">
                <p className="label">Connection issue</p>
                <h3>Unable to load requests</h3>
                <p>{error}</p>
                <MotionButton onClick={loadRequests}>Retry</MotionButton>
              </div>
            ) : null}

            {!isLoading && !error && requests.length === 0 ? (
              <div className="ff-requests-state">
                <p className="label">No requests</p>
                <h3>No maintenance requests yet</h3>
                <p>New work will appear here once requests are submitted through FixFlow.</p>
              </div>
            ) : null}

            {!isLoading && !error && requests.length > 0 && filteredRequests.length === 0 ? (
              <div className="ff-requests-state">
                <p className="label">No matches</p>
                <h3>No requests match your current filters.</h3>
                <p>Adjust the search or filter selections to widen the view.</p>
                <MotionButton onClick={clearFilters}>Clear filters</MotionButton>
              </div>
            ) : null}

            {!isLoading && !error && filteredRequests.length > 0 ? (
              <div className="ff-request-table" role="table" aria-label="Maintenance requests">
                <div className="ff-request-table__header" role="row">
                  <span role="columnheader">Request</span>
                  <span role="columnheader">Location</span>
                  <span role="columnheader">Priority</span>
                  <span role="columnheader">Status</span>
                </div>
                <div className="ff-request-table__body">
                  {filteredRequests.map((request) => (
                    <button
                      key={request.id}
                      type="button"
                      className={`ff-request-item ${selectedRequestId === request.id ? 'is-selected' : ''}`}
                      role="row"
                      aria-label={`${request.title}, ${statusLabels[request.status]}, ${priorityLabels[request.priority]} priority`}
                      aria-pressed={selectedRequestId === request.id}
                      onClick={() => handleSelectRequest(request.id)}
                    >
                      <div className="ff-request-item__main" role="cell">
                        <strong>{request.title}</strong>
                        <p>{request.description}</p>
                      </div>
                      <div className="ff-request-item__location" role="cell">
                        <span className="label">Location</span>
                        <strong>{request.location}</strong>
                      </div>
                      <div role="cell">
                        <span className={`ff-priority ${priorityClassNames[request.priority]}`}>
                          {priorityLabels[request.priority]}
                        </span>
                      </div>
                      <div role="cell">
                        <span className={`ff-status ${statusClassNames[request.status]}`}>
                          {statusLabels[request.status]}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </section>
        </Reveal>
      </div>

      <CreateRequestDialog
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={handleRequestCreated}
      />

      <RequestDetailsDrawer
        key={selectedRequestId ?? 'closed-request-details'}
        open={isDetailOpen}
        request={detailRequest}
        requestId={selectedRequestId}
        isLoading={isDetailLoading}
        error={detailError}
        successMessage={detailSuccessMessage}
        onClose={handleCloseDetails}
        onUpdated={handleRequestUpdated}
        onDeleted={handleRequestDeleted}
        onRetry={() => {
          if (selectedRequestId !== null) {
            loadRequestDetails(selectedRequestId)
          }
        }}
      />
    </AppLayout>
  )
}

function RequestsLoading() {
  return (
    <div className="ff-request-loading" aria-label="Loading requests">
      {Array.from({ length: 5 }, (_, index) => (
        <div className="ff-request-skeleton" key={index}>
          <span />
          <span />
          <span />
          <span />
        </div>
      ))}
    </div>
  )
}

type RequestDetailsDrawerProps = {
  open: boolean
  request: MaintenanceRequest | null
  requestId: number | null
  isLoading: boolean
  error: string | null
  successMessage: string | null
  onClose: () => void
  onUpdated: (request: MaintenanceRequest) => void
  onDeleted: (requestId: number, title: string) => void
  onRetry: () => void
}

function RequestDetailsDrawer({
  open,
  request,
  requestId,
  isLoading,
  error,
  successMessage,
  onClose,
  onUpdated,
  onDeleted,
  onRetry,
}: RequestDetailsDrawerProps) {
  const closeButtonRef = useRef<HTMLButtonElement | null>(null)
  const titleInputRef = useRef<HTMLInputElement | null>(null)
  const saveLockRef = useRef(false)
  const deleteLockRef = useRef(false)
  const [isEditing, setIsEditing] = useState(false)
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  const [editForm, setEditForm] = useState<RequestEditForm | null>(null)
  const [editErrors, setEditErrors] = useState<RequestEditErrors>({})
  const [saveError, setSaveError] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleCancelEdit = useCallback(() => {
    if (request) {
      setEditForm(createEditForm(request))
    }

    setIsEditing(false)
    setEditErrors({})
    setSaveError(null)
    setIsSaving(false)
    saveLockRef.current = false
  }, [request])

  const handleCloseDeleteConfirmation = useCallback(() => {
    setIsDeleteConfirmOpen(false)
    setDeleteError(null)
    setIsDeleting(false)
    deleteLockRef.current = false
  }, [])

  const handleDrawerClose = useCallback(() => {
    if (isDeleteConfirmOpen) {
      handleCloseDeleteConfirmation()
      return
    }

    if (isEditing) {
      handleCancelEdit()
      return
    }

    onClose()
  }, [handleCancelEdit, handleCloseDeleteConfirmation, isDeleteConfirmOpen, isEditing, onClose])

  useEffect(() => {
    if (!open) {
      return undefined
    }

    const focusTimer = window.setTimeout(() => {
      closeButtonRef.current?.focus()
    }, 60)

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleDrawerClose()
      }
    }

    window.addEventListener('keydown', handleEscape)

    return () => {
      window.clearTimeout(focusTimer)
      window.removeEventListener('keydown', handleEscape)
    }
  }, [handleDrawerClose, open])

  useEffect(() => {
    if (!isEditing) {
      return undefined
    }

    const focusTimer = window.setTimeout(() => {
      titleInputRef.current?.focus()
    }, 40)

    return () => window.clearTimeout(focusTimer)
  }, [isEditing])

  if (!open) {
    return null
  }

  const formattedCreatedAt = formatOptionalDateTime(request?.created_at)
  const formattedUpdatedAt = formatOptionalDateTime(request?.updated_at)

  const handleStartEdit = () => {
    if (!request) {
      return
    }

    setIsDeleteConfirmOpen(false)
    setDeleteError(null)
    setEditForm(createEditForm(request))
    setEditErrors({})
    setSaveError(null)
    setIsEditing(true)
  }

  const handleStartDelete = () => {
    if (!request) {
      return
    }

    setIsDeleteConfirmOpen(true)
    setDeleteError(null)
    setIsEditing(false)
  }

  const updateEditField = <TKey extends keyof RequestEditForm>(
    field: TKey,
    value: RequestEditForm[TKey],
  ) => {
    setEditForm((current) => current ? { ...current, [field]: value } : current)
    setEditErrors((current) => {
      if (!current[field]) {
        return current
      }

      const nextErrors = { ...current }
      delete nextErrors[field]
      return nextErrors
    })
    setSaveError(null)
  }

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!request || !editForm || saveLockRef.current) {
      return
    }

    const normalizedForm: RequestEditForm = {
      title: editForm.title.trim(),
      description: editForm.description.trim(),
      location: editForm.location.trim(),
      priority: editForm.priority,
      status: editForm.status,
    }
    const validationErrors = validateEditForm(normalizedForm)

    if (Object.keys(validationErrors).length > 0) {
      setEditErrors(validationErrors)
      setSaveError(null)
      return
    }

    saveLockRef.current = true
    setIsSaving(true)
    setEditErrors({})
    setSaveError(null)

    try {
      const updatedRequest = await requestService.updateRequest(request.id, normalizedForm)
      onUpdated(updatedRequest)
      setEditForm(createEditForm(updatedRequest))
      setIsEditing(false)
    } catch {
      setSaveError('Request could not be updated. Check the gateway connection and try again.')
    } finally {
      saveLockRef.current = false
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!request || deleteLockRef.current) {
      return
    }

    deleteLockRef.current = true
    setIsDeleting(true)
    setDeleteError(null)

    try {
      await requestService.deleteRequest(request.id)
      onDeleted(request.id, request.title)
      handleCloseDeleteConfirmation()
    } catch {
      setDeleteError('Request could not be deleted. Check the gateway connection and try again.')
    } finally {
      deleteLockRef.current = false
      setIsDeleting(false)
    }
  }

  return (
    <div className="ff-details-backdrop" onClick={handleDrawerClose}>
      <aside
        className="ff-details-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="request-details-title"
        aria-describedby="request-details-summary"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="ff-details-drawer__header">
          <div>
            <p className="label">Request details</p>
            <h2 id="request-details-title">
              {request ? request.title : requestId ? `Request #${requestId}` : 'Request'}
            </h2>
          </div>
          <div className="ff-details-drawer__actions">
            {!isLoading && !error && request && !isEditing && !isDeleteConfirmOpen ? (
              <>
                <MotionButton className="ff-detail-edit-button" onClick={handleStartEdit}>
                  Edit
                </MotionButton>
                <button
                  type="button"
                  className="ff-detail-delete-button"
                  aria-label={`Delete request ${request.title}`}
                  onClick={handleStartDelete}
                  disabled={isDeleting}
                >
                  Delete
                </button>
              </>
            ) : null}
            <button
              ref={closeButtonRef}
              type="button"
              className="ff-icon-button"
              aria-label={isEditing || isDeleteConfirmOpen ? 'Cancel editing request' : 'Close request details'}
              onClick={handleDrawerClose}
            >
              x
            </button>
          </div>
        </header>

        <div className="ff-details-drawer__body" id="request-details-summary">
          {successMessage && !isEditing && !isDeleteConfirmOpen ? (
            <div className="ff-form-status ff-form-status--success" role="status">
              {successMessage}
            </div>
          ) : null}

          {isLoading ? (
            <div className="ff-detail-state" aria-live="polite">
              <p className="label">Loading</p>
              <h3>Fetching request details</h3>
              <p>Checking the latest request data through the gateway.</p>
            </div>
          ) : null}

          {!isLoading && error ? (
            <div className="ff-detail-state" role="alert">
              <p className="label">Connection issue</p>
              <h3>Unable to load details</h3>
              <p>{error}</p>
              <MotionButton onClick={onRetry}>Retry</MotionButton>
            </div>
          ) : null}

          {!isLoading && !error && request && isDeleteConfirmOpen ? (
            <div className="ff-detail-delete-confirmation" role="alertdialog" aria-labelledby="request-delete-title" aria-describedby="request-delete-description">
              <p className="label">Delete request</p>
              <h3 id="request-delete-title">Delete "{request.title}"?</h3>
              <p id="request-delete-description">This action cannot be undone.</p>

              {deleteError ? (
                <div className="ff-form-status ff-form-status--error" role="alert">
                  {deleteError}
                </div>
              ) : null}

              <div className="ff-modal__actions">
                <button
                  type="button"
                  className="ff-secondary-button"
                  onClick={handleCloseDeleteConfirmation}
                  disabled={isDeleting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="ff-danger-button"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  aria-label={`Delete request ${request.title}`}
                >
                  {isDeleting ? 'Deleting...' : 'Delete Request'}
                </button>
              </div>
            </div>
          ) : null}

          {!isLoading && !error && request && isEditing && editForm ? (
            <form className="ff-detail-edit-form" onSubmit={handleSave} noValidate>
              {saveError ? (
                <div className="ff-form-status ff-form-status--error" role="alert">
                  {saveError}
                </div>
              ) : null}

              <div className="ff-form-row">
                <label htmlFor="request-edit-title">Title</label>
                <input
                  ref={titleInputRef}
                  id="request-edit-title"
                  type="text"
                  value={editForm.title}
                  onChange={(event) => updateEditField('title', event.target.value)}
                  aria-invalid={Boolean(editErrors.title)}
                  aria-describedby={editErrors.title ? 'request-edit-title-error' : undefined}
                  disabled={isSaving}
                />
                {editErrors.title ? (
                  <p className="ff-field-error" id="request-edit-title-error">
                    {editErrors.title}
                  </p>
                ) : null}
              </div>

              <div className="ff-form-row">
                <label htmlFor="request-edit-description">Description</label>
                <textarea
                  id="request-edit-description"
                  value={editForm.description}
                  onChange={(event) => updateEditField('description', event.target.value)}
                  aria-invalid={Boolean(editErrors.description)}
                  aria-describedby={
                    editErrors.description ? 'request-edit-description-error' : undefined
                  }
                  disabled={isSaving}
                />
                {editErrors.description ? (
                  <p className="ff-field-error" id="request-edit-description-error">
                    {editErrors.description}
                  </p>
                ) : null}
              </div>

              <div className="ff-form-row">
                <label htmlFor="request-edit-location">Location</label>
                <input
                  id="request-edit-location"
                  type="text"
                  value={editForm.location}
                  onChange={(event) => updateEditField('location', event.target.value)}
                  aria-invalid={Boolean(editErrors.location)}
                  aria-describedby={editErrors.location ? 'request-edit-location-error' : undefined}
                  disabled={isSaving}
                />
                {editErrors.location ? (
                  <p className="ff-field-error" id="request-edit-location-error">
                    {editErrors.location}
                  </p>
                ) : null}
              </div>

              <div className="ff-detail-edit-grid">
                <div className="ff-form-row">
                  <label htmlFor="request-edit-priority">Priority</label>
                  <select
                    id="request-edit-priority"
                    value={editForm.priority}
                    onChange={(event) => {
                      if (isRequestPriority(event.target.value)) {
                        updateEditField('priority', event.target.value)
                      }
                    }}
                    aria-invalid={Boolean(editErrors.priority)}
                    aria-describedby={
                      editErrors.priority ? 'request-edit-priority-error' : undefined
                    }
                    disabled={isSaving}
                  >
                    {editablePriorityOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  {editErrors.priority ? (
                    <p className="ff-field-error" id="request-edit-priority-error">
                      {editErrors.priority}
                    </p>
                  ) : null}
                </div>

                <div className="ff-form-row">
                  <label htmlFor="request-edit-status">Status</label>
                  <select
                    id="request-edit-status"
                    value={editForm.status}
                    onChange={(event) => {
                      if (isRequestStatus(event.target.value)) {
                        updateEditField('status', event.target.value)
                      }
                    }}
                    aria-invalid={Boolean(editErrors.status)}
                    aria-describedby={editErrors.status ? 'request-edit-status-error' : undefined}
                    disabled={isSaving}
                  >
                    {editableStatusOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  {editErrors.status ? (
                    <p className="ff-field-error" id="request-edit-status-error">
                      {editErrors.status}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="ff-detail-edit-meta" aria-label="Locked request fields">
                <div>
                  <span>Request ID</span>
                  <strong>#{request.id}</strong>
                </div>
                {request.user_id !== undefined ? (
                  <div>
                    <span>Requester ID</span>
                    <strong>{request.user_id}</strong>
                  </div>
                ) : null}
              </div>

              <div className="ff-modal__actions">
                <button
                  type="button"
                  className="ff-secondary-button"
                  onClick={handleCancelEdit}
                  disabled={isSaving}
                >
                  Cancel
                </button>
                <MotionButton variant="primary" type="submit" disabled={isSaving}>
                  {isSaving ? 'Saving...' : 'Save changes'}
                </MotionButton>
              </div>
            </form>
          ) : null}

          {!isLoading && !error && request && !isEditing ? (
            <div className="ff-detail-content">
              <section className="ff-detail-hero" aria-label="Request summary">
                <span className="ff-detail-id">#{request.id}</span>
                <h3>{request.title}</h3>
                <div className="ff-detail-badges" aria-label="Status and priority">
                  <span className={`ff-status ${statusClassNames[request.status]}`}>
                    {statusLabels[request.status]}
                  </span>
                  <span className={`ff-priority ${priorityClassNames[request.priority]}`}>
                    {priorityLabels[request.priority]}
                  </span>
                </div>
              </section>

              <section className="ff-detail-section" aria-label="Description">
                <p className="label">Description</p>
                <p>{request.description}</p>
              </section>

              <dl className="ff-detail-list">
                <div>
                  <dt>Location</dt>
                  <dd>{request.location}</dd>
                </div>
                <div>
                  <dt>Request ID</dt>
                  <dd>#{request.id}</dd>
                </div>
                {request.user_id !== undefined ? (
                  <div>
                    <dt>Requester ID</dt>
                    <dd>{request.user_id}</dd>
                  </div>
                ) : null}
                {formattedCreatedAt ? (
                  <div>
                    <dt>Created</dt>
                    <dd>{formattedCreatedAt}</dd>
                  </div>
                ) : null}
                {formattedUpdatedAt ? (
                  <div>
                    <dt>Last updated</dt>
                    <dd>{formattedUpdatedAt}</dd>
                  </div>
                ) : null}
              </dl>
            </div>
          ) : null}
        </div>
      </aside>
    </div>
  )
}
