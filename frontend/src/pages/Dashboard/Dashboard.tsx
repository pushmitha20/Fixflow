import AppLayout from '../../components/layout/AppLayout'
import MotionButton from '../../components/MotionButton'
import Reveal from '../../components/Reveal'
import {
  attentionRequests,
  lifecycleStages,
  metrics,
  pulseValues,
  recentRequests,
} from './dashboardData'
import {
  Lifecycle,
  MetricStrip,
  NeedsAttention,
  OperationsPulse,
  RecentRequests,
} from './components'

export default function Dashboard() {
  return (
    <AppLayout title="Dashboard" subtitle="Operations centre">
      <div className="ff-dashboard">
        <Reveal as="header" className="ff-dashboard__intro" delay={40}>
          <div>
            <p className="label">Operations overview</p>
            <h1>Keep track of maintenance activity across your organization.</h1>
          </div>
          <MotionButton variant="primary" arrow>
            New Request
          </MotionButton>
        </Reveal>

        <MetricStrip metrics={metrics} />
        <Lifecycle stages={lifecycleStages} />

        <section className="ff-dashboard__split" aria-label="Recent operational activity">
          <RecentRequests requests={recentRequests} />
          <NeedsAttention requests={attentionRequests} />
        </section>

        <OperationsPulse values={pulseValues} />
      </div>
    </AppLayout>
  )
}
