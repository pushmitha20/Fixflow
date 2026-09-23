import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import AppLayout from '../../components/layout/AppLayout'
import MotionButton from '../../components/MotionButton'
import Reveal from '../../components/Reveal'
import { assignmentService } from '../../services/assignmentService'
import { requestService } from '../../services/requestService'
import { userService } from '../../services/userService'
import type {
  Assignment,
  MaintenanceRequest,
  RequestPriority,
  RequestStatus,
  User,
} from '../../types/api'

type AssignmentsProps = {
  onNavigate?: (item: string) => void
}

type AssignmentRow = {
  assignment: Assignment
  request?: MaintenanceRequest
  technician?: User
}

type AssignmentData = {
  assignments: Assignment[]
  requests: MaintenanceRequest[]
  users: User[]
  unavailableSources: string[]
}

type RequestStatusFilter = 'ALL' | RequestStatus

const requestStatusOrder: RequestStatus[] = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']

const requestStatusLabels: Record<RequestStatus, string> = {
  OPEN: 'Open',
  IN_PROGRESS: 'In Progress',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
}

const requestStatusClassNames: Record<RequestStatus, string> = {
  OPEN: 'ff-status--open',
  IN_PROGRESS: 'ff-status--in-progress',
  RESOLVED: 'ff-status--completed',
  CLOSED: 'ff-status--closed',
}

const priorityLabels: Record<RequestPriority, string> = {
  HIGH: 'High',
  MEDIUM: 'Medium',
  LOW: 'Low',
}

// Assignments are the source of truth; request and user data only enrich rows,
// so a failure there degrades the view instead of hiding real assignments.
const fetchAssignmentData = async (): Promise<AssignmentData> => {
  const [assignmentResult, requestResult, userResult] = await Promise.allSettled([
    assignmentService.getAssignments(),
    requestService.getRequests(),
    userService.getUsers(),
  ])

  if (assignmentResult.status === 'rejected') {
    throw assignmentResult.reason
  }

  const unavailableSources: string[] = []

  if (requestResult.status === 'rejected') {
    unavailableSources.push('request details')
  }

  if (userResult.status === 'rejected') {
    unavailableSources.push('technician names')
  }

  return {
    assignments: assignmentResult.value,
    requests: requestResult.status === 'fulfilled' ? requestResult.value : [],
    users: userResult.status === 'fulfilled' ? userResult.value : [],
    unavailableSources,
  }
}

const LOAD_ERROR = 'Assignments could not be loaded. Check the gateway connection and try again.'

const formatDateTime = (value: string) => {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

const formatStatusLabel = (status: string) =>
  status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase())

const assignmentStatusClassName = (status: string) =>
  `ff-status ff-status--${status.toLowerCase().replace(/_/g, '-')}`

const technicianLabel = ({ assignment, technician }: AssignmentRow) =>
  technician ? technician.name : `Technician #${assignment.technicianId}`

const requestLabel = ({ assignment, request }: AssignmentRow) =>
  request ? request.title : `Request #${assignment.maintenanceRequestId}`

export default function Assignments({ onNavigate }: AssignmentsProps) {
  const [data, setData] = useState<AssignmentData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<RequestStatusFilter>('ALL')
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<number | null>(null)
  const returnFocusRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    let isActive = true

    fetchAssignmentData()
      .then((result) => {
        if (isActive) {
          setData(result)
        }
      })
      .catch(() => {
        if (isActive) {
          setError(LOAD_ERROR)
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
    setError(null)

    try {
      setData(await fetchAssignmentData())
    } catch {
      setError(LOAD_ERROR)
    } finally {
      setIsLoading(false)
    }
  }

  const rows = useMemo<AssignmentRow[]>(() => {
    if (!data) {
      return []
    }

    const requestsById = new Map(data.requests.map((request) => [request.id, request]))
    const usersById = new Map(data.users.map((user) => [user.id, user]))

    return data.assignments
      .map((assignment) => ({
        assignment,
        request: requestsById.get(assignment.maintenanceRequestId),
        technician: usersById.get(assignment.technicianId),
      }))
      .sort(
        (a, b) =>
          new Date(b.assignment.assignedAt).getTime() - new Date(a.assignment.assignedAt).getTime() ||
          b.assignment.id - a.assignment.id,
      )
  }, [data])

  const statusCounts = useMemo(() => {
    const counts = new Map<RequestStatus, number>()

    rows.forEach(({ request }) => {
      if (request) {
        counts.set(request.status, (counts.get(request.status) ?? 0) + 1)
      }
    })

    return counts
  }, [rows])

  const statusOptions = requestStatusOrder.filter((status) => statusCounts.has(status))

  const filteredRows = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase().replace(/^#/, '')

    return rows.filter((row) => {
      const { assignment, request, technician } = row
      const matchesStatus = statusFilter === 'ALL' || request?.status === statusFilter

      if (!matchesStatus) {
        return false
      }

      if (!normalizedSearch) {
        return true
      }

      return [
        String(assignment.id),
        String(assignment.maintenanceRequestId),
        String(assignment.technicianId),
        request?.title,
        request?.location,
        technician?.name,
      ].some((value) => value?.toLowerCase().includes(normalizedSearch))
    })
  }, [rows, searchTerm, statusFilter])

  const totalCount = data?.assignments.length ?? 0
  const hasActiveFilters = searchTerm.trim().length > 0 || statusFilter !== 'ALL'

  const resultLabel = hasActiveFilters
    ? `${filteredRows.length} of ${totalCount} assignments`
    : `${totalCount} ${totalCount === 1 ? 'assignment' : 'assignments'}`

  const clearFilters = () => {
    setSearchTerm('')
    setStatusFilter('ALL')
  }

  const selectedRow = rows.find((row) => row.assignment.id === selectedAssignmentId) ?? null

  const handleSelect = (assignmentId: number, trigger: HTMLButtonElement) => {
    returnFocusRef.current = trigger
    setSelectedAssignmentId(assignmentId)
  }

  const handleCloseDetails = useCallback(() => {
    setSelectedAssignmentId(null)
    returnFocusRef.current?.focus()
  }, [])

  return (
    <AppLayout title="Assignments" subtitle="Technician workload" onNavigate={onNavigate}>
      <div className="ff-requests ff-assignments">
        <Reveal as="header" className="ff-requests__intro" delay={40}>
          <div>
            <p className="label">Technician assignments</p>
            <h1>Who is working which maintenance request.</h1>
          </div>
        </Reveal>

        <Reveal className="ff-requests__workspace" delay={80}>
          <section className="ff-requests__toolbar" aria-label="Assignment filters">
            <div className="ff-requests__search">
              <label htmlFor="assignment-search">Search assignments</label>
              <input
                id="assignment-search"
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Request title, location, technician, or ID"
              />
            </div>

            {statusOptions.length > 0 ? (
              <div className="ff-filter-group" role="group" aria-labelledby="assignment-status-filter">
                <span id="assignment-status-filter">Request status</span>
                <div className="ff-filter-group__options">
                  <button
                    type="button"
                    className={statusFilter === 'ALL' ? 'is-active' : ''}
                    onClick={() => setStatusFilter('ALL')}
                    aria-pressed={statusFilter === 'ALL'}
                  >
                    All
                  </button>
                  {statusOptions.map((status) => (
                    <button
                      key={status}
                      type="button"
                      className={statusFilter === status ? 'is-active' : ''}
                      onClick={() => setStatusFilter(status)}
                      aria-pressed={statusFilter === status}
                    >
                      {requestStatusLabels[status]} · {statusCounts.get(status)}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </section>

          <section className="ff-requests__list" aria-labelledby="assignments-list-heading">
            <div className="ff-requests__list-head">
              <div>
                <p className="label">Live workload</p>
                <h2 id="assignments-list-heading">Assignments</h2>
              </div>
              <span aria-live="polite">{isLoading ? 'Loading assignments' : error ? '' : resultLabel}</span>
            </div>

            {!isLoading && !error && data && data.unavailableSources.length > 0 ? (
              <p className="ff-assignment-notice" role="status">
                Showing assignment records only — {data.unavailableSources.join(' and ')} could not be
                loaded.
              </p>
            ) : null}

            {isLoading ? <AssignmentsLoading /> : null}

            {!isLoading && error ? (
              <div className="ff-requests-state" role="alert">
                <p className="label">Connection issue</p>
                <h3>Unable to load assignments</h3>
                <p>{error}</p>
                <MotionButton onClick={retryLoad}>Retry</MotionButton>
              </div>
            ) : null}

            {!isLoading && !error && totalCount === 0 ? (
              <div className="ff-requests-state">
                <p className="label">No assignments</p>
                <h3>No technician assignments yet</h3>
                <p>Assignments are created automatically when new maintenance requests come in.</p>
              </div>
            ) : null}

            {!isLoading && !error && totalCount > 0 && filteredRows.length === 0 ? (
              <div className="ff-requests-state">
                <p className="label">No matches</p>
                <h3>No assignments match your current filters.</h3>
                <p>Adjust the search or status selection to widen the view.</p>
                <MotionButton onClick={clearFilters}>Clear filters</MotionButton>
              </div>
            ) : null}

            {!isLoading && !error && filteredRows.length > 0 ? (
              <div className="ff-assignment-table">
                <div className="ff-assignment-table__header" aria-hidden="true">
                  <span>ID</span>
                  <span>Maintenance request</span>
                  <span>Technician</span>
                  <span>Request status</span>
                  <span>Assignment</span>
                  <span>Assigned</span>
                </div>
                <ul className="ff-assignment-table__body" aria-label="Technician assignments">
                  {filteredRows.map((row) => {
                    const { assignment, request } = row
                    const isSelected = selectedAssignmentId === assignment.id

                    return (
                      <li key={assignment.id}>
                        <button
                          type="button"
                          className={`ff-assignment-item ${isSelected ? 'is-selected' : ''}`}
                          aria-haspopup="dialog"
                          aria-label={`Assignment ${assignment.id}: ${requestLabel(row)}, ${technicianLabel(row)}, ${formatStatusLabel(assignment.status)}`}
                          onClick={(event) => handleSelect(assignment.id, event.currentTarget)}
                        >
                          <span className="ff-assignment-item__id">#{assignment.id}</span>
                          <span className="ff-assignment-item__cell ff-assignment-item__request">
                            <strong>{requestLabel(row)}</strong>
                            <small>
                              #{assignment.maintenanceRequestId}
                              {request ? ` · ${request.location}` : ' · not in current requests'}
                            </small>
                          </span>
                          <span className="ff-assignment-item__cell">
                            <span className="ff-assignment-item__label">Technician</span>
                            <strong>{technicianLabel(row)}</strong>
                          </span>
                          <span className="ff-assignment-item__cell">
                            <span className="ff-assignment-item__label">Request</span>
                            {request ? (
                              <span className={`ff-status ${requestStatusClassNames[request.status]}`}>
                                {requestStatusLabels[request.status]}
                              </span>
                            ) : (
                              <span className="ff-assignment-item__muted">Unknown</span>
                            )}
                          </span>
                          <span className="ff-assignment-item__cell">
                            <span className="ff-assignment-item__label">Assignment</span>
                            <span className={assignmentStatusClassName(assignment.status)}>
                              {formatStatusLabel(assignment.status)}
                            </span>
                          </span>
                          <span className="ff-assignment-item__cell">
                            <span className="ff-assignment-item__label">Assigned</span>
                            <time dateTime={assignment.assignedAt}>{formatDateTime(assignment.assignedAt)}</time>
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ) : null}
          </section>
        </Reveal>
      </div>

      {selectedRow ? <AssignmentDetailsDrawer row={selectedRow} onClose={handleCloseDetails} /> : null}
    </AppLayout>
  )
}

function AssignmentsLoading() {
  return (
    <div className="ff-request-loading" aria-hidden="true">
      {Array.from({ length: 5 }, (_, index) => (
        <div className="ff-assignment-skeleton" key={index}>
          <span />
          <span />
          <span />
          <span />
          <span />
          <span />
        </div>
      ))}
    </div>
  )
}

type AssignmentDetailsDrawerProps = {
  row: AssignmentRow
  onClose: () => void
}

function AssignmentDetailsDrawer({ row, onClose }: AssignmentDetailsDrawerProps) {
  const closeButtonRef = useRef<HTMLButtonElement | null>(null)
  const { assignment, request, technician } = row

  useEffect(() => {
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
  }, [onClose])

  return (
    <div className="ff-details-backdrop" onClick={onClose}>
      <aside
        className="ff-details-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="assignment-details-title"
        aria-describedby="assignment-details-summary"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="ff-details-drawer__header">
          <div>
            <p className="label">Assignment details</p>
            <h2 id="assignment-details-title">Assignment #{assignment.id}</h2>
          </div>
          <div className="ff-details-drawer__actions">
            <button
              ref={closeButtonRef}
              type="button"
              className="ff-icon-button"
              aria-label="Close assignment details"
              onClick={onClose}
            >
              x
            </button>
          </div>
        </header>

        <div className="ff-details-drawer__body" id="assignment-details-summary">
          <div className="ff-detail-content">
            <section className="ff-detail-hero" aria-label="Assignment summary">
              <span className="ff-detail-id">Request #{assignment.maintenanceRequestId}</span>
              <h3>{request ? request.title : 'Request unavailable'}</h3>
              <div className="ff-detail-badges">
                <span className={assignmentStatusClassName(assignment.status)}>
                  {formatStatusLabel(assignment.status)}
                </span>
                {request ? (
                  <span className={`ff-priority ff-priority--${request.priority.toLowerCase()}`}>
                    {priorityLabels[request.priority]} priority
                  </span>
                ) : null}
              </div>
            </section>

            <dl className="ff-detail-list">
              <div>
                <dt>Assignment ID</dt>
                <dd>#{assignment.id}</dd>
              </div>
              <div>
                <dt>Maintenance request</dt>
                <dd>#{assignment.maintenanceRequestId}</dd>
              </div>
              <div>
                <dt>Technician</dt>
                <dd>
                  {technicianLabel(row)}
                  {technician ? ` (#${technician.id})` : ''}
                </dd>
              </div>
              {technician ? (
                <div>
                  <dt>Technician email</dt>
                  <dd>{technician.email}</dd>
                </div>
              ) : null}
              <div>
                <dt>Assigned</dt>
                <dd>
                  <time dateTime={assignment.assignedAt}>{formatDateTime(assignment.assignedAt)}</time>
                </dd>
              </div>
              {request ? (
                <>
                  <div>
                    <dt>Request status</dt>
                    <dd>{requestStatusLabels[request.status]}</dd>
                  </div>
                  <div>
                    <dt>Location</dt>
                    <dd>{request.location}</dd>
                  </div>
                </>
              ) : null}
            </dl>

            {request ? (
              <section className="ff-detail-section" aria-label="Request description">
                <p className="label">Request description</p>
                <p>{request.description}</p>
              </section>
            ) : (
              <div className="ff-detail-state" role="status">
                <p className="label">Limited data</p>
                <h3>Request details unavailable</h3>
                <p>
                  Request #{assignment.maintenanceRequestId} is not among the maintenance requests currently
                  returned by the gateway.
                </p>
              </div>
            )}
          </div>
        </div>
      </aside>
    </div>
  )
}
