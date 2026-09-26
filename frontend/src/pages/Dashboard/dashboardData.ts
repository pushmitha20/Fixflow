import type { MaintenanceRequest, RequestPriority, RequestStatus } from '../../types/api'

export type MetricTone = 'brand' | 'accent' | 'neutral' | 'critical'

export type DashboardMetric = {
  label: string
  value: string
  change: string
  tone: MetricTone
}

export type LifecycleStage = {
  label: string
  count: number
}

export type RecentRequest = {
  id: number
  title: string
  location: string
  priority: RequestPriority
  status: RequestStatus
}

export type StatusDistributionRow = {
  label: string
  status: RequestStatus
  count: number
  percent: number
}

export type StatusDistribution = {
  total: number
  rows: StatusDistributionRow[]
}

const STATUS_STAGES: Array<{ label: string; status: RequestStatus }> = [
  { label: 'Open', status: 'OPEN' },
  { label: 'In Progress', status: 'IN_PROGRESS' },
  { label: 'Resolved', status: 'RESOLVED' },
  { label: 'Closed', status: 'CLOSED' },
]

const isOpenOrInProgress = (status: RequestStatus) =>
  status === 'OPEN' || status === 'IN_PROGRESS'

export const countByStatus = (requests: MaintenanceRequest[], status: RequestStatus) =>
  requests.filter((request) => request.status === status).length

export const countByPriority = (requests: MaintenanceRequest[], priority: RequestPriority) =>
  requests.filter((request) => request.priority === priority).length

export const buildMetrics = (requests: MaintenanceRequest[]): DashboardMetric[] => {
  const total = requests.length
  const open = countByStatus(requests, 'OPEN')
  const inProgress = countByStatus(requests, 'IN_PROGRESS')
  const resolved = countByStatus(requests, 'RESOLVED')
  const closed = countByStatus(requests, 'CLOSED')
  const completed = resolved + closed
  const highPriorityOpen = requests.filter(
    (request) => request.priority === 'HIGH' && isOpenOrInProgress(request.status),
  ).length

  return [
    { label: 'Total Requests', value: String(total), change: `${open} open`, tone: 'brand' },
    { label: 'Open', value: String(open), change: `${inProgress} in progress`, tone: 'neutral' },
    {
      label: 'High Priority',
      value: String(highPriorityOpen),
      change: highPriorityOpen === 1 ? 'Needs attention' : 'Need attention',
      tone: 'critical',
    },
    {
      label: 'Completed',
      value: String(completed),
      change: `${resolved} resolved · ${closed} closed`,
      tone: 'accent',
    },
  ]
}

export const buildLifecycleStages = (requests: MaintenanceRequest[]): LifecycleStage[] =>
  STATUS_STAGES.map((stage) => ({
    label: stage.label,
    count: countByStatus(requests, stage.status),
  }))

const toRecentRequest = (request: MaintenanceRequest): RecentRequest => ({
  id: request.id,
  title: request.title,
  location: request.location,
  priority: request.priority,
  status: request.status,
})

export const buildRecentRequests = (
  requests: MaintenanceRequest[],
  limit = 5,
): RecentRequest[] =>
  [...requests]
    .sort((a, b) => b.id - a.id)
    .slice(0, limit)
    .map(toRecentRequest)

export const buildNeedsAttention = (requests: MaintenanceRequest[]): RecentRequest[] =>
  requests
    .filter((request) => request.priority === 'HIGH' && isOpenOrInProgress(request.status))
    .sort((a, b) => b.id - a.id)
    .map(toRecentRequest)

export const buildStatusDistribution = (requests: MaintenanceRequest[]): StatusDistribution => {
  const total = requests.length

  return {
    total,
    rows: STATUS_STAGES.map((stage) => {
      const count = countByStatus(requests, stage.status)
      return {
        label: stage.label,
        status: stage.status,
        count,
        percent: total > 0 ? (count / total) * 100 : 0,
      }
    }),
  }
}

export const loadingMessage = 'Loading operational data...'
export const emptyMessage = 'No maintenance activity found for this view.'
export const errorMessage = 'Operational data is temporarily unavailable.'
