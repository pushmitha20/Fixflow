import { useEffect, useMemo, useState } from 'react'
import AppLayout from '../../components/layout/AppLayout'
import MotionButton from '../../components/MotionButton'
import Reveal from '../../components/Reveal'
import { analyticsService } from '../../services/analyticsService'
import { assignmentService } from '../../services/assignmentService'
import { requestService } from '../../services/requestService'
import { userService } from '../../services/userService'
import type { AnalyticsSummary, Assignment, MaintenanceRequest, User } from '../../types/api'
import {
  PRIORITY_ORDER,
  STATUS_ORDER,
  buildAssignmentCoverage,
  buildLocationBreakdown,
  buildPriorityBreakdown,
  buildPriorityStatusMatrix,
  buildStatusBreakdown,
  buildTechnicianWorkload,
  formatPercent,
  isActive,
  percentOf,
  priorityLabels,
  statusLabels,
  type BreakdownRow,
} from './analyticsData'

type AnalyticsProps = {
  onNavigate?: (item: string) => void
}

type AnalyticsData = {
  requests: MaintenanceRequest[]
  assignments: Assignment[] | null
  users: User[] | null
  summary: AnalyticsSummary | null
}

const LOAD_ERROR = 'Request data could not be loaded. Check the gateway connection and try again.'
const LOCATION_LIMIT = 8

// Current requests are the primary source for every headline number; the other sources
// only feed their own sections, so their failure degrades the page instead of blocking it.
const fetchAnalyticsData = async (): Promise<AnalyticsData> => {
  const [requestResult, assignmentResult, userResult, summaryResult] = await Promise.allSettled([
    requestService.getRequests(),
    assignmentService.getAssignments(),
    userService.getUsers(),
    analyticsService.getSummary(),
  ])

  if (requestResult.status === 'rejected') {
    throw requestResult.reason
  }

  return {
    requests: requestResult.value,
    assignments: assignmentResult.status === 'fulfilled' ? assignmentResult.value : null,
    users: userResult.status === 'fulfilled' ? userResult.value : null,
    summary: summaryResult.status === 'fulfilled' ? summaryResult.value : null,
  }
}

const statusToneClass: Record<string, string> = {
  OPEN: 'is-open',
  IN_PROGRESS: 'is-progress',
  RESOLVED: 'is-completed',
  CLOSED: 'is-closed',
  HIGH: 'is-critical',
  MEDIUM: 'is-progress',
  LOW: 'is-completed',
}

export default function Analytics({ onNavigate }: AnalyticsProps) {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isActiveRequest = true

    fetchAnalyticsData()
      .then((result) => {
        if (isActiveRequest) {
          setData(result)
        }
      })
      .catch(() => {
        if (isActiveRequest) {
          setError(LOAD_ERROR)
        }
      })
      .finally(() => {
        if (isActiveRequest) {
          setIsLoading(false)
        }
      })

    return () => {
      isActiveRequest = false
    }
  }, [])

  const retryLoad = async () => {
    setIsLoading(true)
    setError(null)

    try {
      setData(await fetchAnalyticsData())
    } catch {
      setError(LOAD_ERROR)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AppLayout title="Analytics" subtitle="Operational intelligence" onNavigate={onNavigate}>
      <div className="ff-requests ff-analytics">
        <Reveal as="header" className="ff-requests__intro" delay={40}>
          <div>
            <p className="label">Analytics</p>
            <h1>Operational view of maintenance activity.</h1>
          </div>
        </Reveal>

        {isLoading ? <AnalyticsLoading /> : null}

        {!isLoading && error ? (
          <div className="ff-analytics-panel ff-requests-state" role="alert">
            <p className="label">Connection issue</p>
            <h3>Unable to load analytics</h3>
            <p>{error}</p>
            <MotionButton onClick={retryLoad}>Retry</MotionButton>
          </div>
        ) : null}

        {!isLoading && !error && data ? <AnalyticsContent data={data} /> : null}
      </div>
    </AppLayout>
  )
}

function AnalyticsContent({ data }: { data: AnalyticsData }) {
  const { requests, assignments, users, summary } = data
  const total = requests.length

  const derived = useMemo(() => {
    const active = requests.filter((request) => isActive(request.status)).length
    const highActive = requests.filter(
      (request) => request.priority === 'HIGH' && isActive(request.status),
    ).length

    return {
      active,
      highActive,
      statusRows: buildStatusBreakdown(requests),
      priorityRows: buildPriorityBreakdown(requests),
      matrix: buildPriorityStatusMatrix(requests),
      locations: buildLocationBreakdown(requests),
      coverage: assignments ? buildAssignmentCoverage(requests, assignments) : null,
      workload: assignments ? buildTechnicianWorkload(requests, assignments, users ?? []) : null,
    }
  }, [requests, assignments, users])

  const { active, highActive, statusRows, priorityRows, matrix, locations, coverage, workload } = derived

  const unavailable = [
    assignments === null ? 'assignments' : null,
    users === null ? 'technician names' : null,
    summary === null ? 'Analytics Service event counts' : null,
  ].filter((value): value is string => value !== null)

  return (
    <>
      <Reveal className="ff-analytics__context" delay={60}>
        <p>
          Derived from <strong>{total}</strong> current maintenance {total === 1 ? 'request' : 'requests'}
          {assignments ? (
            <>
              {' '}and <strong>{assignments.length}</strong> assignment{' '}
              {assignments.length === 1 ? 'record' : 'records'}
            </>
          ) : null}{' '}
          returned by the gateway. Requests carry no timestamps, so no time-based trends are shown.
        </p>
        {unavailable.length > 0 ? (
          <p className="ff-analytics-notice" role="status">
            Partial data — {unavailable.join(', ')} could not be loaded. Related sections show what is
            available.
          </p>
        ) : null}
      </Reveal>

      <Reveal delay={80}>
        <section className="ff-metric-strip ff-analytics__metrics" aria-label="Headline metrics">
          <div className="ff-metric brand">
            <span className="label">Active work</span>
            <strong>{active}</strong>
            <small>
              Open + In Progress · {formatPercent(percentOf(active, total))} of {total}
            </small>
          </div>
          <div className="ff-metric">
            <span className="label">High priority active</span>
            <strong>{highActive}</strong>
            <small>{formatPercent(percentOf(highActive, active))} of active work</small>
          </div>
          <div className="ff-metric">
            <span className="label">Requests assigned</span>
            <strong>{coverage ? coverage.assignedRequests : '—'}</strong>
            <small>{coverage ? `of ${total} current requests` : 'Assignment data unavailable'}</small>
          </div>
          <div className="ff-metric accent">
            <span className="label">Active, unassigned</span>
            <strong>{coverage ? coverage.unassignedActiveRequests : '—'}</strong>
            <small>{coverage ? 'Active requests with no assignment record' : 'Assignment data unavailable'}</small>
          </div>
        </section>
      </Reveal>

      <Reveal className="ff-analytics__grid" delay={100}>
        <section className="ff-analytics-panel" aria-labelledby="analytics-status-heading">
          <PanelHeading id="analytics-status-heading" label="Lifecycle" title="Requests by status" />
          <BreakdownBars rows={statusRows} total={total} emptyText="No requests to break down yet." />
        </section>

        <section className="ff-analytics-panel" aria-labelledby="analytics-priority-heading">
          <PanelHeading id="analytics-priority-heading" label="Urgency" title="Requests by priority" />
          <BreakdownBars rows={priorityRows} total={total} emptyText="No requests to break down yet." />
        </section>

        <section className="ff-analytics-panel ff-analytics-panel--wide" aria-labelledby="analytics-matrix-heading">
          <PanelHeading id="analytics-matrix-heading" label="Cross-section" title="Priority by status" />
          {total === 0 ? (
            <p className="ff-analytics-empty">No requests to cross-tabulate yet.</p>
          ) : (
            <div className="ff-analytics-table-wrap">
              <table className="ff-analytics-table">
                <thead>
                  <tr>
                    <th scope="col">Priority</th>
                    {STATUS_ORDER.map((status) => (
                      <th key={status} scope="col">
                        {statusLabels[status]}
                      </th>
                    ))}
                    <th scope="col">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {matrix.map((row) => (
                    <tr key={row.priority}>
                      <th scope="row">{row.label}</th>
                      {STATUS_ORDER.map((status) => (
                        <td key={status} className={row.counts[status] === 0 ? 'is-zero' : ''}>
                          {row.counts[status]}
                        </td>
                      ))}
                      <td className="is-total">{row.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="ff-analytics-panel" aria-labelledby="analytics-coverage-heading">
          <PanelHeading id="analytics-coverage-heading" label="Assignments" title="Assignment coverage" />
          {coverage ? (
            <dl className="ff-analytics-facts">
              <div>
                <dt>Assignment records</dt>
                <dd>{coverage.assignmentRecords}</dd>
              </div>
              <div>
                <dt>Current requests with an assignment</dt>
                <dd>{coverage.assignedRequests}</dd>
              </div>
              <div>
                <dt>Current requests without an assignment</dt>
                <dd>{coverage.unassignedRequests}</dd>
              </div>
              <div>
                <dt>Requests with more than one assignment record</dt>
                <dd>{coverage.requestsWithMultipleAssignments}</dd>
              </div>
              <div>
                <dt>Records referencing a request not currently returned</dt>
                <dd>{coverage.recordsWithoutCurrentRequest}</dd>
              </div>
            </dl>
          ) : (
            <p className="ff-analytics-empty">Assignment data could not be loaded.</p>
          )}
        </section>

        <section className="ff-analytics-panel" aria-labelledby="analytics-workload-heading">
          <PanelHeading id="analytics-workload-heading" label="Workload" title="Assignments by technician" />
          {workload === null ? (
            <p className="ff-analytics-empty">Assignment data could not be loaded.</p>
          ) : workload.length === 0 ? (
            <p className="ff-analytics-empty">No assignment records yet.</p>
          ) : (
            <ol className="ff-analytics-bars">
              {workload.map((row) => (
                <li key={row.technicianId}>
                  <div className="ff-analytics-bars__row">
                    <span className="ff-analytics-bars__label">
                      {row.name ? `${row.name} (#${row.technicianId})` : `Technician #${row.technicianId}`}
                    </span>
                    <span className="ff-analytics-bars__value">
                      {row.assignmentRecords} {row.assignmentRecords === 1 ? 'record' : 'records'} ·{' '}
                      {formatPercent(row.percent)}
                    </span>
                  </div>
                  <Bar percent={row.percent} tone="is-assigned" />
                  <p className="ff-analytics-bars__note">
                    {row.activeRequests} active {row.activeRequests === 1 ? 'request' : 'requests'}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="ff-analytics-panel" aria-labelledby="analytics-location-heading">
          <PanelHeading id="analytics-location-heading" label="Locations" title="Requests by location" />
          {locations.length === 0 ? (
            <p className="ff-analytics-empty">No request locations recorded yet.</p>
          ) : (
            <>
              <ol className="ff-analytics-bars">
                {locations.slice(0, LOCATION_LIMIT).map((row) => (
                  <li key={row.key}>
                    <div className="ff-analytics-bars__row">
                      <span className="ff-analytics-bars__label">{row.label}</span>
                      <span className="ff-analytics-bars__value">
                        {row.count} · {formatPercent(row.percent)}
                      </span>
                    </div>
                    <Bar percent={row.percent} tone="is-brand" />
                    <p className="ff-analytics-bars__note">{row.activeCount} active</p>
                  </li>
                ))}
              </ol>
              {locations.length > LOCATION_LIMIT ? (
                <p className="ff-analytics-footnote">
                  Showing the {LOCATION_LIMIT} busiest of {locations.length} locations. The remaining{' '}
                  {locations.length - LOCATION_LIMIT} account for{' '}
                  {locations.slice(LOCATION_LIMIT).reduce((sum, row) => sum + row.count, 0)} requests.
                </p>
              ) : null}
            </>
          )}
        </section>

        <section className="ff-analytics-panel" aria-labelledby="analytics-events-heading">
          <PanelHeading id="analytics-events-heading" label="Analytics Service" title="Recorded event stream" />
          {summary ? (
            <>
              <dl className="ff-analytics-facts">
                <div>
                  <dt>Request-created events recorded</dt>
                  <dd>{summary.total_requests}</dd>
                </div>
                <div>
                  <dt>Assignment events recorded</dt>
                  <dd>{summary.total_assignments}</dd>
                </div>
                <div>
                  <dt>Priority at creation</dt>
                  <dd>{formatEventPriorities(summary.requests_by_priority)}</dd>
                </div>
              </dl>
              <p className="ff-analytics-footnote">
                Cumulative Kafka event counts kept by the Analytics Service. They include only events
                received while it was consuming and do not change when requests are edited or deleted, so
                they are not directly comparable with the {total} current requests above.
              </p>
            </>
          ) : (
            <p className="ff-analytics-empty">Analytics Service event counts could not be loaded.</p>
          )}
        </section>
      </Reveal>
    </>
  )
}

const formatEventPriorities = (counts: Record<string, number>) => {
  const keys = Object.keys(counts).sort((a, b) => {
    const rank = (key: string) => {
      const index = PRIORITY_ORDER.indexOf(key as (typeof PRIORITY_ORDER)[number])
      return index === -1 ? PRIORITY_ORDER.length : index
    }
    return rank(a) - rank(b) || a.localeCompare(b)
  })

  if (keys.length === 0) {
    return 'None recorded'
  }

  return keys
    .map((key) => `${priorityLabels[key as keyof typeof priorityLabels] ?? key} ${counts[key]}`)
    .join(' · ')
}

function PanelHeading({ id, label, title }: { id: string; label: string; title: string }) {
  return (
    <div className="ff-analytics-panel__head">
      <p className="label">{label}</p>
      <h2 id={id}>{title}</h2>
    </div>
  )
}

function Bar({ percent, tone }: { percent: number; tone: string }) {
  return (
    <div className="ff-analytics-bar" aria-hidden="true">
      <span className={tone} style={{ width: `${Math.min(Math.max(percent, 0), 100)}%` }} />
    </div>
  )
}

function BreakdownBars({ rows, total, emptyText }: { rows: BreakdownRow[]; total: number; emptyText: string }) {
  if (total === 0) {
    return <p className="ff-analytics-empty">{emptyText}</p>
  }

  return (
    <ol className="ff-analytics-bars">
      {rows.map((row) => (
        <li key={row.key}>
          <div className="ff-analytics-bars__row">
            <span className="ff-analytics-bars__label">{row.label}</span>
            <span className="ff-analytics-bars__value">
              {row.count} · {formatPercent(row.percent)}
            </span>
          </div>
          <Bar percent={row.percent} tone={statusToneClass[row.key] ?? 'is-brand'} />
        </li>
      ))}
    </ol>
  )
}

function AnalyticsLoading() {
  return (
    <div className="ff-analytics-loading" role="status" aria-label="Loading analytics">
      <div className="ff-analytics-loading__strip" aria-hidden="true">
        {Array.from({ length: 4 }, (_, index) => (
          <span key={index} />
        ))}
      </div>
      <div className="ff-analytics__grid" aria-hidden="true">
        {Array.from({ length: 4 }, (_, index) => (
          <div className="ff-analytics-panel ff-analytics-loading__panel" key={index}>
            <span />
            <span />
            <span />
            <span />
          </div>
        ))}
      </div>
    </div>
  )
}
