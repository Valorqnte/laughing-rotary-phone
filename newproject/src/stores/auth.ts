import { computed, reactive } from 'vue'

export interface AuthUser {
  id: number
  username: string
  role: string
}

const readPersistedUser = (): AuthUser | null => {
  try {
    const raw = localStorage.getItem('auth:user')
    return raw ? (JSON.parse(raw) as AuthUser) : null
  } catch (error) {
    console.warn('Failed to parse persisted user', error)
    return null
  }
}

const state = reactive<{ user: AuthUser | null }>({
  user: readPersistedUser(),
})

const persist = (user: AuthUser | null) => {
  if (user) {
    localStorage.setItem('auth:user', JSON.stringify(user))
  } else {
    localStorage.removeItem('auth:user')
  }
}

const setUser = (user: AuthUser | null) => {
  state.user = user
  persist(user)
}

export const authDirectAccess = {
  getUser: () => state.user,
  setUser,
}

export const useAuthStore = () => {
  const user = computed(() => state.user)
  const isAuthenticated = computed(() => Boolean(state.user))
  const isAdmin = computed(() => state.user?.role === 'admin')

  const logout = () => setUser(null)

  return {
    user,
    isAuthenticated,
    isAdmin,
    setUser,
    logout,
  }
}

