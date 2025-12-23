import http from './http'

export interface UserSummary {
  id: number
  username: string
  role: string
}

export type User = UserSummary

export interface UserBorrowRecord {
  borrow_id: number
  book_id: number
  title: string
  author?: string | null
  status: 'borrowed' | 'returned'
  borrow_date?: string
  return_date?: string | null
}

export const fetchUsers = async (params?: { q?: string; role?: string }) => {
  const { data } = await http.get<UserSummary[]>('/users', { params })
  return data
}

export const deleteUser = async (id: number) => {
  await http.delete(`/users/${id}`)
}

export const updatePassword = async (id: number, password: string) => {
  await http.put(`/users/${id}/password`, { password })
}

export const fetchUserBorrowed = async (userId: number) => {
  const { data } = await http.get<UserBorrowRecord[]>(`/users/${userId}/borrowed`)
  return data
}
