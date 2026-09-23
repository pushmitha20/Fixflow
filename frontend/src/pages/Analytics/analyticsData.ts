import type { Assignment, MaintenanceRequest, RequestPriority, RequestStatus, User } from '../../types/api'
import { countByPriority, countByStatus } from '../Dashboard/dashboardData'

export type BreakdownRow<TKey extends string = string> = {
  key: TKey
  label: string
  count: number
  percent: number
}

export type PriorityStatusRow = {
  priority: RequestPriority
  label: string
  counts: Record<RequestStatus, number>
  total: number
}

export type AssignmentCoverage = {
  assignmentRecords: number
  assignedRequests: number
  unassignedRequests: number
  unassignedActiveRequests: number
  requestsWithMultipleAssignments: number
  recordsWithoutCurrentRequest: number
}

export type TechnicianWorkload = {
  technicianId: number
  name: string | null
  assignmentRecords: number
  activeRequests: number
  percent: number
}

export type LocationRow = BreakdownRow & {
  activeCount: number
}

export const STATUS_ORDER: RequestStatus[] = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']
export const PRIORITY_ORDER: RequestPriority[] = ['HIGH', 'MEDIUM', 'LOW']

export const statusLabels: Record<RequestStatus, string> = {
  OPEN: 'Open',
  IN_PROGRESS: 'In Progress',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
}

export const priorityLabels: Record<RequestPriority, string> = {
  HIGH: 'High',
  MEDIUM: 'Medium',
  LOW: 'Low',
}

export const isActive = (status: RequestStatus) => status === 'OPEN' || status === 'IN_PROGRESS'

// Share of a total as a percentage; an empty total yields 0 instead of NaN.
export const percentOf = (count: number, total: number) => (total > 0 ? (count / total) * 100 : 0)

export const formatPercent = (percent: number) => `${Math.round(percent)}%`

export const buildStatusBreakdown = (requests: MaintenanceRequest[]): BreakdownRow<RequestStatus>[] =>
  STATUS_ORDER.map((status) => {
    const count = countByStatus(requests, status)
    return { key: status, label: statusLabels[status], count, percent: percentOf(count, requests.length) }
  })

export const buildPriorityBreakdown = (requests: MaintenanceRequest[]): BreakdownRow<RequestPriority>[] =>
  PRIORITY_ORDER.map((priority) => {
    const count = countByPriority(requests, priority)
    return { key: priority, label: priorityLabels[priority], count, percent: percentOf(count, requests.length) }
  })

export const buildPriorityStatusMatrix = (requests: MaintenanceRequest[]): PriorityStatusRow[] =>
  PRIORITY_ORDER.map((priority) => {
    const inPriority = requests.filter((request) => request.priority === priority)
    const counts = Object.fromEntries(
      STATUS_ORDER.map((status) => [status, countByStatus(inPriority, status)]),
    ) as Record<RequestStatus, number>

    return { priority, label: priorityLabels[priority], counts, total: inPriority.length }
  })

// Assignment records are not guaranteed to be one per request, so request coverage is
// derived from unique maintenanceRequestId values that match a current request.
export const buildAssignmentCoverage = (
  requests: MaintenanceRequest[],
  assignments: Assignment[],
): AssignmentCoverage => {
  const currentRequestIds = new Set(requests.map((request) => request.id))
  const recordsPerRequest = new Map<number, number>()

  assignments.forEach((assignment) => {
    recordsPerRequest.set(
      assignment.maintenanceRequestId,
      (recordsPerRequest.get(assignment.maintenanceRequestId) ?? 0) + 1,
    )
  })

  const assignedRequests = requests.filter((request) => recordsPerRequest.has(request.id))

  return {
    assignmentRecords: assignments.length,
    assignedRequests: assignedRequests.length,
    unassignedRequests: requests.length - assignedRequests.length,
    unassignedActiveRequests: requests.filter(
      (request) => isActive(request.status) && !recordsPerRequest.has(request.id),
    ).length,
    requestsWithMultipleAssignments: assignedRequests.filter(
      (request) => (recordsPerRequest.get(request.id) ?? 0) > 1,
    ).length,
    recordsWithoutCurrentRequest: assignments.filter(
      (assignment) => !currentRequestIds.has(assignment.maintenanceRequestId),
    ).length,
  }
}

export const buildTechnicianWorkload = (
  requests: MaintenanceRequest[],
  assignments: Assignment[],
  users: User[],
): TechnicianWorkload[] => {
  const requestsById = new Map(requests.map((request) => [request.id, request]))
  const usersById = new Map(users.map((user) => [user.id, user]))
  const recordsByTechnician = new Map<number, Assignment[]>()

  assignments.forEach((assignment) => {
    const records = recordsByTechnician.get(assignment.technicianId) ?? []
    records.push(assignment)
    recordsByTechnician.set(assignment.technicianId, records)
  })

  return [...recordsByTechnician.entries()]
    .map(([technicianId, records]) => {
      const activeRequestIds = new Set(
        records
          .filter((record) => {
            const request = requestsById.get(record.maintenanceRequestId)
            return request !== undefined && isActive(request.status)
          })
          .map((record) => record.maintenanceRequestId),
      )

      return {
        technicianId,
        name: usersById.get(technicianId)?.name ?? null,
        assignmentRecords: records.length,
        activeRequests: activeRequestIds.size,
        percent: percentOf(records.length, assignments.length),
      }
    })
    .sort((a, b) => b.assignmentRecords - a.assignmentRecords || a.technicianId - b.technicianId)
}

export const buildLocationBreakdown = (requests: MaintenanceRequest[]): LocationRow[] => {
  const byLocation = new Map<string, MaintenanceRequest[]>()

  requests.forEach((request) => {
    const location = request.location.trim()
    const group = byLocation.get(location) ?? []
    group.push(request)
    byLocation.set(location, group)
  })

  return [...byLocation.entries()]
    .map(([location, group]) => ({
      key: location,
      label: location,
      count: group.length,
      percent: percentOf(group.length, requests.length),
      activeCount: group.filter((request) => isActive(request.status)).length,
    }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
}
