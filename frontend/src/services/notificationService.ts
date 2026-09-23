import apiClient from './apiClient'
import type { SystemNotification } from '../types/api'

const NOTIFICATIONS_PATH = '/notifications'

export const notificationService = {
  getNotifications: async (): Promise<SystemNotification[]> => {
    return apiClient.get<SystemNotification[]>(NOTIFICATIONS_PATH)
  },
}

export default notificationService
