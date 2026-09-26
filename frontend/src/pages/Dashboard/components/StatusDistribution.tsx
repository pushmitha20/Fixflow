import { useId } from 'react'
import { Reveal } from './index'
import type { StatusDistribution as StatusDistributionData } from '../dashboardData'

type StatusDistributionProps = {
  distribution: StatusDistributionData
}

// Keeps tiny shares from reading as 0% and near-total shares from reading as 100%.
const formatPercent = (percent: number) => {
  if (percent === 0 || percent === 100) return `${percent}%`
  if (percent < 1) return '<1%'
  if (percent > 99) return '>99%'
  return `${Math.round(percent)}%`
}

export default function StatusDistribution({ distribution }: StatusDistributionProps) {
  const headingId = useId()
  const { total, rows } = distribution

  return (
    <Reveal as="section" className="ff-panel ff-panel--status">
      <div className="ff-section-head">
        <div>
          <p className="label">Request status</p>
          <h3 id={headingId}>Current workload</h3>
          <p className="ff-status-dist__summary">
            {total} {total === 1 ? 'request' : 'requests'} across the maintenance workflow
          </p>
        </div>
      </div>

      <ul className="ff-status-dist" aria-labelledby={headingId}>
        {rows.map((row) => {
          const percentLabel = formatPercent(row.percent)
          const statusModifier = row.status.toLowerCase().replace(/_/g, '-')

          return (
            <li key={row.status} className={`ff-status-dist__row ff-status-dist__row--${statusModifier}`}>
              <div className="ff-status-dist__meta">
                <span className="ff-status-dist__label">{row.label}</span>
                <span className="ff-status-dist__count">
                  {row.count}
                  <span className="ff-visually-hidden"> {row.count === 1 ? 'request' : 'requests'},</span>
                </span>
                <span className="ff-status-dist__percent">{percentLabel}</span>
              </div>
              <div className="ff-status-dist__track" aria-hidden="true">
                <span
                  className={`ff-status-dist__fill${row.count > 0 ? ' is-filled' : ''}`}
                  style={{ width: `${row.percent}%` }}
                />
              </div>
            </li>
          )
        })}
      </ul>
    </Reveal>
  )
}
