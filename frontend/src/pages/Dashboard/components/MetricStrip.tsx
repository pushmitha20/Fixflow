import { Reveal } from './index'
import type { DashboardMetric } from '../dashboardData'

type MetricStripProps = {
  metrics: DashboardMetric[]
}

export default function MetricStrip({ metrics }: MetricStripProps) {
  return (
    <section className="ff-metric-strip" aria-label="Operational metrics">
      {metrics.map((metric, index) => (
        <Reveal key={metric.label} className={`ff-metric ${metric.tone}`} delay={index * 70}>
          <span className="label">{metric.label}</span>
          <strong>{metric.value}</strong>
          <small>{metric.change}</small>
        </Reveal>
      ))}
    </section>
  )
}
