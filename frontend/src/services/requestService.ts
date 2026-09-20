import apiClient from './apiClient'
import type {
  CreateMaintenanceRequest,
  MaintenanceRequest,
  UpdateMaintenanceRequest,
} from '../types/api'

export const requestService = {
  getRequests: async (): Promise<MaintenanceRequest[]> => {
    return apiClient.get<MaintenanceRequest[]>('/requests')
  },

  getRequest: async (id: number): Promise<MaintenanceRequest> => {
    return apiClient.get<MaintenanceRequest>(`/requests/${id}`)
  },

  createRequest: async (
    data: CreateMaintenanceRequest,
  ): Promise<MaintenanceRequest> => {
    return apiClient.post<MaintenanceRequest>('/requests', data)
  },

  updateRequest: async (
    id: number,
    data: UpdateMaintenanceRequest,
  ): Promise<MaintenanceRequest> => {
    return apiClient.put<MaintenanceRequest>(`/requests/${id}`, data)
  },

  deleteRequest: async (id: number): Promise<{ message: string }> => {
    return apiClient.delete<{ message: string }>(`/requests/${id}`)
  },
}

export default requestService
