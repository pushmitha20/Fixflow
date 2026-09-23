import type { UserRole } from '../../types/api'

export const ROLE_ORDER: UserRole[] = ['STUDENT', 'TECHNICIAN', 'ADMIN']

export const roleLabels: Record<UserRole, string> = {
  STUDENT: 'Student',
  TECHNICIAN: 'Technician',
  ADMIN: 'Admin',
}
