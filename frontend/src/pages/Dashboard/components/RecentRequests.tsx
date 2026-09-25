import Reveal from '../../../components/Reveal'
import type { RecentRequest } from '../dashboardData'
import { formatStatus, getPriorityClass, getStatusClass } from './requestBadges'

type RecentRequestsProps = {
  requests: RecentRequest[]
  onOpenRequest?: (requestId: number) => void
}

export default function RecentRequests({ requests, onOpenRequest }: RecentRequestsProps) {
  return (
    <Reveal as="section" className="ff-panel ff-panel--stack ff-panel--recent" aria-label="Recent requests">
      <div className="ff-section-head">
        <div>
          <h3>Recent requests</h3>
        </div>
      </div>

      {requests.length === 0 ? (
        <p className="ff-dashboard-empty">No maintenance requests yet.</p>
      ) : (
        <ul className="ff-request-list" aria-label="Recent maintenance requests">
          {requests.map((request) => (
            <li key={request.id} className="ff-request-list__item">
              <button
                type="button"
                className="ff-request-row"
                aria-haspopup="dialog"
                aria-label={`View request ${request.title}, ${request.priority} priority, ${formatStatus(request.status)}`}
                onClick={() => onOpenRequest?.(request.id)}
              >
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
              </button>
            </li>
          ))}
        </ul>
      )}
    </Reveal>
  )
}
