import { Reveal } from './index'
import type { LifecycleStage } from '../dashboardData'

type LifecycleProps = {
  stages: LifecycleStage[]
}

export default function Lifecycle({ stages }: LifecycleProps) {
  return (
    <Reveal as="section" className="ff-lifecycle" aria-label="Request lifecycle">
      <div className="ff-section-head">
        <div>
          <p className="label">Lifecycle</p>
          <h3>Request flow</h3>
        </div>
      </div>

      <div className="ff-lifecycle__track" role="list" aria-label="Maintenance request lifecycle">
        {stages.map((stage, index) => (
          <div
            key={stage.label}
            className={`ff-lifecycle__item ff-lifecycle__item--${stage.label.toLowerCase().replace(/\s+/g, '-')}`}
            role="listitem"
          >
            <div className="ff-lifecycle__meta">
              <span>{stage.label}</span>
              <strong>{stage.count}</strong>
            </div>
            {index < stages.length - 1 ? <span className="ff-lifecycle__arrow" aria-hidden="true">→</span> : null}
          </div>
        ))}
      </div>
    </Reveal>
  )
}
