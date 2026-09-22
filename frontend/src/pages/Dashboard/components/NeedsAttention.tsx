import Reveal from '../../../components/Reveal'
import type { RecentRequest } from '../dashboardData'

type NeedsAttentionProps = {
  requests: RecentRequest[]
}

function getPriorityClass(priority: RecentRequest['priority']) {
  return `ff-priority ff-priority--${priority.toLowerCase()}`
}

export default function NeedsAttention({ requests }: NeedsAttentionProps) {
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
          {requests.map((request) => (
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
    </Reveal>
  )
}
