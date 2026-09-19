import AppLayout from './components/layout/AppLayout'

function App() {
  return (
    <AppLayout title="Dashboard" subtitle="Operations centre">
      <section className="ff-placeholder">
        <div className="ff-placeholder__header">
          <p className="label">Placeholder shell</p>
          <h1>Dashboard</h1>
        </div>

        <p className="ff-placeholder__text">
          Your maintenance operations at a glance.
        </p>

        <div className="ff-placeholder__grid">
          <article className="ff-placeholder__card">
            <span className="label">Open</span>
            <strong>48</strong>
            <small>Requests requiring attention</small>
          </article>
          <article className="ff-placeholder__card">
            <span className="label">Assigned</span>
            <strong>19</strong>
            <small>Active work orders</small>
          </article>
          <article className="ff-placeholder__card">
            <span className="label">Completed</span>
            <strong>126</strong>
            <small>Across all sites</small>
          </article>
        </div>
      </section>
    </AppLayout>
  )
}

export default App
