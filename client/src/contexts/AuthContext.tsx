import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { apiClient } from '../lib/api'

interface User {
  id: number
  email: string
  name: string
  role: string
}

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  refreshToken: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const checkAuth = useCallback(async () => {
    try {
      const token = apiClient.getToken()
      if (!token) {
        setUser(null)
        return
      }

      const response = await apiClient.get<User>('/auth/me')
      if (response.success && response.data) {
        setUser(response.data)
      } else {
        apiClient.setToken(null)
        setUser(null)
      }
    } catch {
      apiClient.setToken(null)
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  const login = async (email: string, password: string) => {
    const response = await apiClient.post<{ user: User; token: string }>('/auth/login', {
      email,
      password,
    })

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Login failed')
    }

    apiClient.setToken(response.data.token)
    setUser(response.data.user)
  }

  const logout = async () => {
    try {
      await apiClient.post('/auth/logout')
    } catch {
      // Ignore logout errors
    } finally {
      apiClient.setToken(null)
      setUser(null)
    }
  }

  const refreshToken = async () => {
    try {
      const response = await apiClient.post<{ user: User; token: string }>('/auth/refresh')
      if (response.success && response.data) {
        apiClient.setToken(response.data.token)
        setUser(response.data.user)
      }
    } catch {
      apiClient.setToken(null)
      setUser(null)
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        refreshToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
