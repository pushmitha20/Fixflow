import Reveal from '../../../components/Reveal'
import type { RecentRequest } from '../dashboardData'

type NeedsAttentionProps = {
  requests: RecentRequest[]
  onViewAll?: () => void
}

const VISIBLE_LIMIT = 5

function getPriorityClass(priority: RecentRequest['priority']) {
  return `ff-priority ff-priority--${priority.toLowerCase()}`
}

export default function NeedsAttention({ requests, onViewAll }: NeedsAttentionProps) {
  const visibleRequests = requests.slice(0, VISIBLE_LIMIT)
  const hiddenCount = requests.length - visibleRequests.length

  return (
    <Reveal as="section" className="ff-panel ff-panel--stack" aria-label="Needs attention">
      <div className="ff-section-head">
        <div>
          <p className="label">Attention</p>
          <h3>Needs attention</h3>
        </div>
      </div>

      {requests.length === 0 ? (
        <p className="ff-dashboard-empty">Nothing needs attention right now.</p>
      ) : (
        <ul className="ff-attention-list">
          {visibleRequests.map((request) => (
            <li key={request.id} className="ff-attention-item">
              <span className="ff-attention-item__marker" aria-hidden="true" />
              <div>
                <strong>{request.title}</strong>
                <span>{request.location}</span>
              </div>
              <span className={getPriorityClass(request.priority)}>{request.priority}</span>
            </li>
          ))}
        </ul>
      )}

      {hiddenCount > 0 ? (
        <button type="button" className="ff-secondary-button ff-attention-more" onClick={onViewAll}>
          +{hiddenCount} more · View requests
        </button>
      ) : null}
    </Reveal>
  )
}
