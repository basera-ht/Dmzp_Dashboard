export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

export function getMediaUrl(url?: string | null): string {
  if (!url) return ''
  if (url.startsWith('data:') || url.startsWith('blob:')) {
    return url
  }
  const backendOrigin = API_BASE_URL.replace(/\/api\/?$/, '')

  // Route private S3 URLs through our public media streaming proxy to bypass 403 blocks
  if (url.includes('.amazonaws.com/')) {
    const parts = url.split('.amazonaws.com/')
    const s3Key = parts[1]
    if (s3Key) {
      return `${backendOrigin}/api/media/${s3Key}`
    }
  }

  if (url.startsWith('/api/')) {
    return `${backendOrigin}${url}`
  }

  if (url.startsWith('/uploads/')) {
    return `${backendOrigin}${url}`
  }

  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url
  }

  return `${backendOrigin}/api/media/${url.replace(/^\/+/, '')}`
}

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
    options: RequestInit = {},
    isRetry = false
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

      // Handle 401 Unauthorized
      if (response.status === 401) {
        if (!isRetry) {
          // Try refresh token once if available, otherwise proceed to unauthorized handling
          const refreshed = await this.refreshToken()
          if (refreshed) {
            return this.request<T>(endpoint, options, true)
          }
        }
        return {
          success: false,
          error: 'Session expired. Please log in again.',
        }
      }

      if (!response.ok) {
        const text = await response.text()
        let errorMsg = `Request failed with status ${response.status}`
        if (text) {
          try {
            const errData = JSON.parse(text)
            if (errData.error) errorMsg = errData.error
            else if (errData.message) errorMsg = errData.message
          } catch {
            errorMsg = text
          }
        }
        return {
          success: false,
          error: errorMsg,
        }
      }

      const text = await response.text()
      if (!text) {
        return { success: true } as ApiResponse<T>
      }
      try {
        const data = JSON.parse(text)
        return data
      } catch {
        return {
          success: false,
          error: 'Failed to parse response JSON',
        }
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        return {
          success: false,
          error: 'Request timeout. Please check your connection.',
        }
      }
      return {
        success: false,
        error: error.message || 'An unexpected error occurred',
      }
    }
  }

  private async refreshToken(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      })
      return response.ok
    } catch {
      return false
    }
  }

  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET' })
  }

  async post<T>(endpoint: string, data?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async put<T>(endpoint: string, data?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async patch<T>(endpoint: string, data?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' })
  }

  async postForm<T>(endpoint: string, formData: FormData): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`

    const headers: Record<string, string> = {
      'X-Requested-With': 'XMLHttpRequest',
    }
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: formData,
      })

      const text = await response.text()
      let data: any = {}
      if (text) {
        try {
          data = JSON.parse(text)
        } catch {
          data = { error: text }
        }
      }
      if (!response.ok) {
        return { success: false, error: data.error || `Upload failed with status ${response.status}` }
      }
      return data
    } catch (error: any) {
      return { success: false, error: error.message || 'Upload failed' }
    }
  }

  async putForm<T>(endpoint: string, formData: FormData): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`

    const headers: Record<string, string> = {
      'X-Requested-With': 'XMLHttpRequest',
    }
    try {
      const response = await fetch(url, {
        method: 'PUT',
        headers,
        credentials: 'include',
        body: formData,
      })

      const text = await response.text()
      let data: any = {}
      if (text) {
        try {
          data = JSON.parse(text)
        } catch {
          data = { error: text }
        }
      }
      if (!response.ok) {
        return { success: false, error: data.error || `Upload failed with status ${response.status}` }
      }
      return data
    } catch (error: any) {
      return { success: false, error: error.message || 'Upload failed' }
    }
  }
}

export const apiClient = new ApiClient(API_BASE_URL)
export type { ApiResponse }
