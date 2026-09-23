import apiClient from './apiClient'
import type { AnalyticsSummary } from '../types/api'

const ANALYTICS_SUMMARY_PATH = '/analytics/summary'

export const analyticsService = {
  getSummary: async (): Promise<AnalyticsSummary> => {
    return apiClient.get<AnalyticsSummary>(ANALYTICS_SUMMARY_PATH)
  },
}

export default analyticsService
