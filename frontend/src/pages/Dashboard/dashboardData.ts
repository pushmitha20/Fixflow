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

export type Priority = 'HIGH' | 'CRITICAL' | 'MEDIUM' | 'LOW'
export type RequestStatus = 'OPEN' | 'ASSIGNED' | 'IN PROGRESS' | 'COMPLETED'

export type RecentRequest = {
  id: string
  title: string
  location: string
  priority: Priority
  status: RequestStatus
  timeAgo: string
}

export const metrics: DashboardMetric[] = [
  { label: 'Total Requests', value: '184', change: '+12 this week', tone: 'brand' },
  { label: 'Open', value: '48', change: '9 need review', tone: 'neutral' },
  { label: 'Critical', value: '06', change: '2 unresolved', tone: 'critical' },
  { label: 'Completed', value: '126', change: '92% SLA', tone: 'accent' },
]

export const lifecycleStages: LifecycleStage[] = [
  { label: 'Open', count: 48 },
  { label: 'Assigned', count: 21 },
  { label: 'In Progress', count: 14 },
  { label: 'Completed', count: 126 },
]

export const recentRequests: RecentRequest[] = [
  {
    id: 'REQ-1024',
    title: 'Projector not working',
    location: 'Engineering Lab 03',
    priority: 'HIGH',
    status: 'OPEN',
    timeAgo: '12 min ago',
  },
  {
    id: 'REQ-1028',
    title: 'Air conditioner leaking',
    location: 'Main Building — Floor 2',
    priority: 'CRITICAL',
    status: 'IN PROGRESS',
    timeAgo: '34 min ago',
  },
  {
    id: 'REQ-1031',
    title: 'Network outlet unavailable',
    location: 'Computer Lab 05',
    priority: 'MEDIUM',
    status: 'ASSIGNED',
    timeAgo: '1 hr ago',
  },
  {
    id: 'REQ-1040',
    title: 'Printer malfunction',
    location: 'Administration Office',
    priority: 'LOW',
    status: 'COMPLETED',
    timeAgo: '2 hrs ago',
  },
]

export const attentionRequests: RecentRequest[] = [
  {
    id: 'REQ-1018',
    title: 'Boiler room inspection',
    location: 'Plant Annex',
    priority: 'CRITICAL',
    status: 'OPEN',
    timeAgo: '8 min ago',
  },
  {
    id: 'REQ-1019',
    title: 'Lift cabin service',
    location: 'North Tower',
    priority: 'HIGH',
    status: 'IN PROGRESS',
    timeAgo: '19 min ago',
  },
  {
    id: 'REQ-1020',
    title: 'Water pressure irregularity',
    location: 'Warehouse 02',
    priority: 'HIGH',
    status: 'ASSIGNED',
    timeAgo: '42 min ago',
  },
]

export const pulseValues = [42, 44, 49, 52, 48, 58, 62, 66, 61, 74, 72, 78]

export const loadingMessage = 'Loading operational data...'
export const emptyMessage = 'No maintenance activity found for this view.'
export const errorMessage = 'Operational data is temporarily unavailable.'
