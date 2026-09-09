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
  register: (email: string, password: string, name: string) => Promise<void>
  logout: () => Promise<void>
  refreshToken: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const checkAuth = useCallback(async () => {
    try {
      const response = await apiClient.get<User>('/auth/me')
      if (response.success && response.data) {
        setUser(response.data)
      } else {
        setUser(null)
      }
    } catch {
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  const login = async (email: string, password: string) => {
    const response = await apiClient.post<{ user: User }>('/auth/login', {
      email,
      password,
    })

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Login failed')
    }

    setUser(response.data.user)
  }

  const register = async (email: string, password: string, name: string) => {
    const response = await apiClient.post<{ user: User }>('/auth/register', {
      email,
      password,
      name,
    })

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Registration failed')
    }

    setUser(response.data.user)
  }

  const logout = async () => {
    try {
      await apiClient.post('/auth/logout')
    } catch {
      // Ignore logout errors
    } finally {
      setUser(null)
    }
  }

  const refreshToken = async () => {
    try {
      const response = await apiClient.post<{ user: User }>('/auth/refresh')
      if (response.success && response.data) {
        setUser(response.data.user)
      }
    } catch {
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
        register,
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
