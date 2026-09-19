import AppLayout from './components/layout/AppLayout'
import MotionButton from './components/MotionButton'
import Reveal from './components/Reveal'

function App() {
  return (
    <AppLayout title="Dashboard" subtitle="Operations centre">
      <Reveal as="section" className="ff-placeholder">
        <div className="ff-placeholder__header">
          <p className="label">Placeholder shell</p>
          <h1>Dashboard</h1>
        </div>

        <p className="ff-placeholder__text">
          Your maintenance operations at a glance.
        </p>

        <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <MotionButton variant="primary" arrow>
            New Request
          </MotionButton>
          <MotionButton>Review Queue</MotionButton>
        </div>

        <div className="ff-placeholder__grid">
          <article className="ff-placeholder__card ff-list-row">
            <span className="label">Open</span>
            <strong>48</strong>
            <small>Requests requiring attention</small>
          </article>
          <article className="ff-placeholder__card ff-list-row">
            <span className="label">Assigned</span>
            <strong>19</strong>
            <small>Active work orders</small>
          </article>
          <article className="ff-placeholder__card ff-list-row">
            <span className="label">Completed</span>
            <strong>126</strong>
            <small>Across all sites</small>
          </article>
        </div>
      </Reveal>
    </AppLayout>
  )
}

export default App
