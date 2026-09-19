import Reveal from '../../../components/Reveal'

type OperationsPulseProps = {
  values: number[]
}

export default function OperationsPulse({ values }: OperationsPulseProps) {
  const max = Math.max(...values)
  const min = Math.min(...values)
  const range = max - min || 1

  const points = values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * 100
      const y = 100 - ((value - min) / range) * 72 - 12
      return `${x},${y}`
    })
    .join(' ')

  return (
    <Reveal as="section" className="ff-panel ff-panel--pulse" aria-label="Operations pulse">
      <div className="ff-section-head">
        <div>
          <p className="label">Trend</p>
          <h3>Operations pulse</h3>
        </div>
      </div>

      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="ff-pulse-chart" role="img" aria-label="Maintenance activity trend over recent days">
        <defs>
          <linearGradient id="pulseFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="rgba(23, 107, 99, 0.28)" />
            <stop offset="100%" stopColor="rgba(23, 107, 99, 0.02)" />
          </linearGradient>
        </defs>
        <polyline points={`0,100 ${points} 100,100`} fill="url(#pulseFill)" opacity="0.9" />
        <polyline points={points} fill="none" stroke="var(--ff-brand)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>

      <div className="ff-pulse-labels" aria-label="Trend labels">
        <span>Mon</span>
        <span>Tue</span>
        <span>Wed</span>
        <span>Thu</span>
        <span>Fri</span>
        <span>Sat</span>
        <span>Sun</span>
      </div>
    </Reveal>
  )
}
