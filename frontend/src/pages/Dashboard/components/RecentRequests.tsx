import Reveal from '../../../components/Reveal'
import type { RecentRequest } from '../dashboardData'

type RecentRequestsProps = {
  requests: RecentRequest[]
}

function getPriorityClass(priority: RecentRequest['priority']) {
  return `ff-priority ff-priority--${priority.toLowerCase()}`
}

function getStatusClass(status: RecentRequest['status']) {
  return `ff-status ff-status--${status.toLowerCase().replace(/_/g, '-')}`
}

function formatStatus(status: RecentRequest['status']) {
  return status.replace(/_/g, ' ')
}

export default function RecentRequests({ requests }: RecentRequestsProps) {
  return (
    <Reveal as="section" className="ff-panel ff-panel--stack" aria-label="Recent requests">
      <div className="ff-section-head">
        <div>
          <p className="label">Operational queue</p>
          <h3>Recent requests</h3>
        </div>
      </div>

      {requests.length === 0 ? (
        <p className="ff-dashboard-empty">No maintenance requests yet.</p>
      ) : (
        <ul className="ff-request-list" aria-label="Recent maintenance requests">
          {requests.map((request) => (
            <li key={request.id} className="ff-request-row">
              <div className="ff-request-row__main">
                <div>
                  <strong>{request.title}</strong>
                  <span>{request.location}</span>
                </div>
              </div>

              <div className="ff-request-row__meta">
                <span className={getPriorityClass(request.priority)}>{request.priority}</span>
                <span className={getStatusClass(request.status)}>{formatStatus(request.status)}</span>
              </div>

              <span className="ff-request-row__arrow" aria-hidden="true">
                →
              </span>
            </li>
          ))}
        </ul>
      )}
    </Reveal>
  )
}
