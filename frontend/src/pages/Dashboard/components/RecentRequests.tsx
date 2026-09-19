import Reveal from '../../../components/Reveal'
import type { RecentRequest } from '../dashboardData'

type RecentRequestsProps = {
  requests: RecentRequest[]
}

function getPriorityClass(priority: RecentRequest['priority']) {
  return `ff-priority ff-priority--${priority.toLowerCase()}`
}

function getStatusClass(status: RecentRequest['status']) {
  return `ff-status ff-status--${status.toLowerCase().replace(/\s+/g, '-')}`
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
              <span className={getStatusClass(request.status)}>{request.status}</span>
              <small>{request.timeAgo}</small>
            </div>

            <span className="ff-request-row__arrow" aria-hidden="true">
              →
            </span>
          </li>
        ))}
      </ul>
    </Reveal>
  )
}
