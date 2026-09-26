import { useCallback, useEffect, useMemo, useState } from 'react'
import AppLayout from '../../components/layout/AppLayout'
import MotionButton from '../../components/MotionButton'
import Reveal from '../../components/Reveal'
import { requestService } from '../../services/requestService'
import type { MaintenanceRequest, RequestPriority } from '../../types/api'
import { ApiError } from '../../types/api'
import {
  buildLifecycleStages,
  buildMetrics,
  buildNeedsAttention,
  buildRecentRequests,
  buildStatusDistribution,
} from './dashboardData'
import {
  Lifecycle,
  MetricStrip,
  NeedsAttention,
  RecentRequests,
  RequestQuickView,
  StatusDistribution,
} from './components'

type DashboardProps = {
  onNavigate?: (item: string) => void
  onViewRequestsByPriority?: (priority: RequestPriority) => void
}

export default function Dashboard({ onNavigate, onViewRequestsByPriority }: DashboardProps) {
  const [requests, setRequests] = useState<MaintenanceRequest[] | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewedRequestId, setViewedRequestId] = useState<number | null>(null)

  const loadDashboard = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const data = await requestService.getRequests()
      setRequests(data)
    } catch (caughtError) {
      const message =
        caughtError instanceof ApiError
          ? caughtError.message
          : 'Unable to reach the API gateway. Check your connection and try again.'
      setError(message)
      setRequests(null)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    requestService
      .getRequests()
      .then((data) => {
        setRequests(data)
      })
      .catch((caughtError) => {
        const message =
          caughtError instanceof ApiError
            ? caughtError.message
            : 'Unable to reach the API gateway. Check your connection and try again.'
        setError(message)
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [])

  const metrics = useMemo(() => buildMetrics(requests ?? []), [requests])
  const lifecycleStages = useMemo(() => buildLifecycleStages(requests ?? []), [requests])
  const recentRequests = useMemo(() => buildRecentRequests(requests ?? [], 6), [requests])
  const attentionRequests = useMemo(() => buildNeedsAttention(requests ?? []), [requests])
  const statusDistribution = useMemo(() => buildStatusDistribution(requests ?? []), [requests])

  const viewedRequest = useMemo(
    () => requests?.find((request) => request.id === viewedRequestId) ?? null,
    [requests, viewedRequestId],
  )
  const closeRequestView = useCallback(() => setViewedRequestId(null), [])

  const hasData = requests !== null

  return (
    <AppLayout title="Dashboard" subtitle="Operations centre" onNavigate={onNavigate}>
      <div className="ff-dashboard">
        <Reveal as="header" className="ff-dashboard__intro" delay={40}>
          <div>
            <h1>Keep track of maintenance activity across your organization.</h1>
          </div>
          <MotionButton variant="primary" arrow onClick={() => onNavigate?.('Requests')}>
            New Request
          </MotionButton>
        </Reveal>

        {!isLoading && error ? (
          <div className="ff-requests-state" role="alert">
            <p className="label">Connection issue</p>
            <h3>Unable to load dashboard data</h3>
            <p>{error}</p>
            <MotionButton onClick={loadDashboard}>Retry</MotionButton>
          </div>
        ) : null}

        {isLoading ? <DashboardSkeleton /> : null}

        {!isLoading && !error && hasData ? (
          <>
            <MetricStrip metrics={metrics} />
            <Lifecycle stages={lifecycleStages} />

            <section className="ff-dashboard__split" aria-label="Recent operational activity">
              <RecentRequests
                requests={recentRequests}
                onOpenRequest={setViewedRequestId}
                onViewAll={() => onNavigate?.('Requests')}
              />
              <NeedsAttention
                requests={attentionRequests}
                onViewHighPriority={() => onViewRequestsByPriority?.('HIGH')}
              />
            </section>

            <StatusDistribution distribution={statusDistribution} />
          </>
        ) : null}
      </div>

      {viewedRequest ? <RequestQuickView request={viewedRequest} onClose={closeRequestView} /> : null}
    </AppLayout>
  )
}

function DashboardSkeleton() {
  return (
    <div className="ff-dashboard-skeleton" aria-label="Loading operational data" role="status">
      <div className="ff-dashboard-skeleton__strip">
        {Array.from({ length: 4 }, (_, index) => (
          <div className="ff-dashboard-skeleton__tile" key={index}>
            <span className="ff-dashboard-skeleton__line ff-dashboard-skeleton__line--label" />
            <span className="ff-dashboard-skeleton__line ff-dashboard-skeleton__line--value" />
            <span className="ff-dashboard-skeleton__line ff-dashboard-skeleton__line--small" />
          </div>
        ))}
      </div>

      <div className="ff-dashboard-skeleton__panel ff-dashboard-skeleton__panel--wide">
        <span className="ff-dashboard-skeleton__line ff-dashboard-skeleton__line--label" />
        <div className="ff-dashboard-skeleton__track">
          {Array.from({ length: 4 }, (_, index) => (
            <span className="ff-dashboard-skeleton__line ff-dashboard-skeleton__line--block" key={index} />
          ))}
        </div>
      </div>

      <div className="ff-dashboard-skeleton__split">
        <div className="ff-dashboard-skeleton__panel">
          <span className="ff-dashboard-skeleton__line ff-dashboard-skeleton__line--label" />
          {Array.from({ length: 4 }, (_, index) => (
            <span className="ff-dashboard-skeleton__line ff-dashboard-skeleton__line--row" key={index} />
          ))}
        </div>
        <div className="ff-dashboard-skeleton__panel">
          <span className="ff-dashboard-skeleton__line ff-dashboard-skeleton__line--label" />
          {Array.from({ length: 3 }, (_, index) => (
            <span className="ff-dashboard-skeleton__line ff-dashboard-skeleton__line--row" key={index} />
          ))}
        </div>
      </div>

      <div className="ff-dashboard-skeleton__panel ff-dashboard-skeleton__panel--wide">
        <span className="ff-dashboard-skeleton__line ff-dashboard-skeleton__line--label" />
        {Array.from({ length: 4 }, (_, index) => (
          <span className="ff-dashboard-skeleton__line ff-dashboard-skeleton__line--bar" key={index} />
        ))}
      </div>
    </div>
  )
}
