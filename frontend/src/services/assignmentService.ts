import apiClient from './apiClient'
import type { Assignment } from '../types/api'

const ASSIGNMENTS_PATH = '/assignments'

export const assignmentService = {
  getAssignments: async (): Promise<Assignment[]> => {
    return apiClient.get<Assignment[]>(ASSIGNMENTS_PATH)
  },
}

export default assignmentService
