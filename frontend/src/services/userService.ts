import apiClient from './apiClient'
import type { CreateUser, DeleteUserResponse, UpdateUser, User } from '../types/api'

const USERS_PATH = '/users'

const userPath = (id: number) => `${USERS_PATH}/${encodeURIComponent(String(id))}`

export const userService = {
  getUsers: async (): Promise<User[]> => {
    return apiClient.get<User[]>(USERS_PATH)
  },

  getUser: async (id: number): Promise<User> => {
    return apiClient.get<User>(userPath(id))
  },

  createUser: async (data: CreateUser): Promise<User> => {
    return apiClient.post<User>(USERS_PATH, data)
  },

  updateUser: async (id: number, data: UpdateUser): Promise<User> => {
    return apiClient.put<User>(userPath(id), data)
  },

  deleteUser: async (id: number): Promise<DeleteUserResponse> => {
    return apiClient.delete<DeleteUserResponse>(userPath(id))
  },
}

export default userService
