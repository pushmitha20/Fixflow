import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import AppLayout from '../../components/layout/AppLayout'
import MotionButton from '../../components/MotionButton'
import Reveal from '../../components/Reveal'
import { requestService } from '../../services/requestService'
import type {
  MaintenanceRequest,
  RequestPriority,
  RequestStatus,
} from '../../types/api'
import CreateRequestDialog from './CreateRequestDialog'

type RequestsProps = {
  onNavigate?: (item: string) => void
}

type StatusFilter = RequestStatus | 'ALL'
type PriorityFilter = RequestPriority | 'ALL'

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

export default function Requests({ onNavigate }: RequestsProps) {
  const [requests, setRequests] = useState<MaintenanceRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('ALL')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [selectedRequestId, setSelectedRequestId] = useState<number | null>(null)
  const [detailRequest, setDetailRequest] = useState<MaintenanceRequest | null>(null)
  const [isDetailLoading, setIsDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)

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
    })
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
  }

  const handleCloseDetails = useCallback(() => {
    setSelectedRequestId(null)
    setDetailRequest(null)
    setDetailError(null)
    setIsDetailLoading(false)
  }, [])

  const handleRequestCreated = (createdRequest: MaintenanceRequest) => {
    setRequests((current) => [createdRequest, ...current])
    setError(null)
    setSuccessMessage(`Request "${createdRequest.title}" was created successfully.`)
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
    <AppLayout title="Requests" subtitle="Maintenance desk" onNavigate={onNavigate}>
      <div className="ff-requests">
        <Reveal as="header" className="ff-requests__intro" delay={40}>
          <div>
            <p className="label">Maintenance requests</p>
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
        open={isDetailOpen}
        request={detailRequest}
        requestId={selectedRequestId}
        isLoading={isDetailLoading}
        error={detailError}
        onClose={handleCloseDetails}
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
  onClose: () => void
  onRetry: () => void
}

function RequestDetailsDrawer({
  open,
  request,
  requestId,
  isLoading,
  error,
  onClose,
  onRetry,
}: RequestDetailsDrawerProps) {
  const closeButtonRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    if (!open) {
      return undefined
    }

    const focusTimer = window.setTimeout(() => {
      closeButtonRef.current?.focus()
    }, 60)

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleEscape)

    return () => {
      window.clearTimeout(focusTimer)
      window.removeEventListener('keydown', handleEscape)
    }
  }, [onClose, open])

  if (!open) {
    return null
  }

  const formattedCreatedAt = formatOptionalDateTime(request?.created_at)
  const formattedUpdatedAt = formatOptionalDateTime(request?.updated_at)

  return (
    <div className="ff-details-backdrop" onClick={onClose}>
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
          <button
            ref={closeButtonRef}
            type="button"
            className="ff-icon-button"
            aria-label="Close request details"
            onClick={onClose}
          >
            x
          </button>
        </header>

        <div className="ff-details-drawer__body" id="request-details-summary">
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

          {!isLoading && !error && request ? (
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
