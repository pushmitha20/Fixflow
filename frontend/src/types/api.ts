export class ApiError extends Error {
  readonly status: number
  readonly details: unknown

  constructor(status: number, message: string, details?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.details = details ?? null
  }
}

export type RequestPriority = 'LOW' | 'MEDIUM' | 'HIGH'

export type RequestStatus =
  | 'OPEN'
  | 'IN_PROGRESS'
  | 'RESOLVED'
  | 'CLOSED'

export type MaintenanceRequest = {
  id: number
  title: string
  description: string
  location: string
  priority: RequestPriority
  status: RequestStatus
}

export type CreateMaintenanceRequest = {
  user_id: number
  title: string
  description: string
  location: string
  priority: RequestPriority
}

export type UpdateMaintenanceRequest = {
  title: string
  description: string
  location: string
  priority: RequestPriority
  status: RequestStatus
}
