export class ApiError extends Error {
  readonly status: number
  readonly statusText: string
  readonly details: unknown

  constructor(
    status: number,
    statusText: string,
    message: string,
    details?: unknown,
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.statusText = statusText
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
  user_id?: number
  title: string
  description: string
  location: string
  priority: RequestPriority
  status: RequestStatus
  created_at?: string
  updated_at?: string
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

export type DeleteMaintenanceRequestResponse = {
  message: string
}

export type Assignment = {
  id: number
  maintenanceRequestId: number
  technicianId: number
  status: string
  assignedAt: string
}

export type UserRole = 'STUDENT' | 'TECHNICIAN' | 'ADMIN'

export type User = {
  id: number
  name: string
  email: string
  role: UserRole
}

export type SystemNotification = {
  id: number
  user_id: number
  message: string
  type: string
  is_read: boolean
  created_at: string
}
