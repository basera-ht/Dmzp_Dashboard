export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

interface ApiError {
  message: string
  code?: string
}

interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

class ApiClient {
  private baseUrl: string

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      ...options.headers,
    }

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000)

      const response = await fetch(url, {
        ...options,
        headers,
        credentials: 'include',
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      const text = await response.text()
      let data
      try {
        data = JSON.parse(text)
      } catch {
        data = { success: false, error: text }
      }

      if (!response.ok) {
        const error: ApiError = {
          message: data.error || data.message || 'An error occurred',
          code: data.code,
        }
        
        throw error
      }

      return data
    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw { message: 'Request timed out. Please try again.' }
      }
      throw error
    }
  }

  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET' })
  }

  async post<T>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    })
  }

  async put<T>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    })
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' })
  }

  async postForm<T>(endpoint: string, formData: FormData): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`

    const headers: Record<string, string> = {}
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: formData,
      })

      const data = await response.json()
      return data
    } catch (error: any) {
      return { success: false, error: error.message || 'Upload failed' }
    }
  }

  async putForm<T>(endpoint: string, formData: FormData): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`

    const headers: Record<string, string> = {}
    try {
      const response = await fetch(url, {
        method: 'PUT',
        headers,
        credentials: 'include',
        body: formData,
      })

      const data = await response.json()
      return data
    } catch (error: any) {
      return { success: false, error: error.message || 'Upload failed' }
    }
  }
}

export const apiClient = new ApiClient(API_BASE_URL)
export type { ApiResponse }
