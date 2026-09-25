import type { RequestPriority, RequestStatus } from '../../../types/api'

export function getPriorityClass(priority: RequestPriority) {
  return `ff-priority ff-priority--${priority.toLowerCase()}`
}

export function getStatusClass(status: RequestStatus) {
  return `ff-status ff-status--${status.toLowerCase().replace(/_/g, '-')}`
}

export function formatStatus(status: RequestStatus) {
  return status.replace(/_/g, ' ')
}
