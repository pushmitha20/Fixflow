import apiClient from './apiClient'
import type {
  CreateMaintenanceRequest,
  DeleteMaintenanceRequestResponse,
  MaintenanceRequest,
  UpdateMaintenanceRequest,
} from '../types/api'

const REQUESTS_PATH = '/requests'

const requestPath = (id: number) => `${REQUESTS_PATH}/${encodeURIComponent(String(id))}`

export const requestService = {
  getRequests: async (): Promise<MaintenanceRequest[]> => {
    return apiClient.get<MaintenanceRequest[]>(REQUESTS_PATH)
  },

  getRequest: async (id: number): Promise<MaintenanceRequest> => {
    return apiClient.get<MaintenanceRequest>(requestPath(id))
  },

  createRequest: async (
    data: CreateMaintenanceRequest,
  ): Promise<MaintenanceRequest> => {
    return apiClient.post<MaintenanceRequest>(REQUESTS_PATH, data)
  },

  updateRequest: async (
    id: number,
    data: UpdateMaintenanceRequest,
  ): Promise<MaintenanceRequest> => {
    return apiClient.put<MaintenanceRequest>(requestPath(id), data)
  },

  deleteRequest: async (id: number): Promise<DeleteMaintenanceRequestResponse> => {
    return apiClient.delete<DeleteMaintenanceRequestResponse>(requestPath(id))
  },
}

export default requestService
