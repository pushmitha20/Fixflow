import apiClient from './apiClient'
import type { User } from '../types/api'

const USERS_PATH = '/users'

export const userService = {
  getUsers: async (): Promise<User[]> => {
    return apiClient.get<User[]>(USERS_PATH)
  },
}

export default userService
