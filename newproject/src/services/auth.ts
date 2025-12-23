import http from './http'

export interface LoginPayload {
  username: string
  password: string
}

export interface AuthResponse {
  success: boolean
  user: {
    id: number
    username: string
    role: string
  }
}

export const login = (payload: LoginPayload) => http.post<AuthResponse>('/login', payload)
export const register = (payload: LoginPayload) => http.post('/register', payload)

