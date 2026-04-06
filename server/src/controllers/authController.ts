import { eq } from 'drizzle-orm'
import { db } from '../database/index.js'
import { users } from '../models/index.js'
import { verifyPassword, generateToken, sanitizeInput, isValidEmail } from '../utils/security.js'
import { generateTokens, refreshAccessToken, revokeToken, revokeAllUserTokens } from '../middleware/auth.js'
import type { AuthRequest } from '../middleware/auth.js'
import type { ApiResponse } from '../types/index.js'

export const authController = {
  async login(email: string, password: string, ip?: string): Promise<ApiResponse<any>> {
    try {
      const sanitizedEmail = sanitizeInput(email).toLowerCase()
      
      if (!isValidEmail(sanitizedEmail)) {
        return { success: false, error: 'Invalid email format', code: 'INVALID_EMAIL' }
      }

      const result = await db.select().from(users).where(eq(users.email, sanitizedEmail))
      
      if (result.length === 0) {
        return { success: false, error: 'Invalid email or password', code: 'INVALID_CREDENTIALS' }
      }

      const user = result[0]
      const passwordParts = user.password.split(':')
      const storedHash = passwordParts[0]
      const salt = passwordParts[1] || ''
      const isValid = verifyPassword(password, storedHash, salt)

      if (!isValid) {
        return { success: false, error: 'Invalid email or password', code: 'INVALID_CREDENTIALS' }
      }

      const tokens = generateTokens(user.id, {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      })

      return {
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
          },
          token: tokens.token,
          refreshToken: tokens.refreshToken,
          expiresIn: tokens.expiresIn,
        },
      }
    } catch (error: any) {
      console.error('Login error:', error)
      return { success: false, error: 'An error occurred during login', code: 'LOGIN_ERROR' }
    }
  },

  async register(data: { email: string; password: string; name: string }): Promise<ApiResponse<any>> {
    try {
      const sanitizedEmail = sanitizeInput(data.email).toLowerCase()
      const sanitizedName = sanitizeInput(data.name)

      if (!isValidEmail(sanitizedEmail)) {
        return { success: false, error: 'Invalid email format', code: 'INVALID_EMAIL' }
      }

      if (sanitizedName.length < 2) {
        return { success: false, error: 'Name must be at least 2 characters', code: 'INVALID_NAME' }
      }

      if (data.password.length < 8) {
        return { success: false, error: 'Password must be at least 8 characters', code: 'WEAK_PASSWORD' }
      }

      const existingUser = await db.select().from(users).where(eq(users.email, sanitizedEmail))
      if (existingUser.length > 0) {
        return { success: false, error: 'Email already registered', code: 'EMAIL_EXISTS' }
      }

      const { hashPassword } = await import('../utils/security.js')
      const { hash, salt } = hashPassword(data.password)
      const hashedPasswordWithSalt = `${hash}:${salt}`

      const result = await db
        .insert(users)
        .values({
          email: sanitizedEmail,
          password: hashedPasswordWithSalt,
          name: sanitizedName,
          role: 'User',
        })
        .returning()

      const user = result[0]
      const tokens = generateTokens(user.id, {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      })

      return {
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
          },
          token: tokens.token,
          refreshToken: tokens.refreshToken,
          expiresIn: tokens.expiresIn,
        },
      }
    } catch (error: any) {
      console.error('Registration error:', error)
      return { success: false, error: 'An error occurred during registration', code: 'REGISTRATION_ERROR' }
    }
  },

  async me(req: AuthRequest): Promise<ApiResponse<any>> {
    try {
      if (!req.user?.id) {
        return { success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' }
      }

      const result = await db.select().from(users).where(eq(users.id, req.user.id))
      
      if (result.length === 0) {
        return { success: false, error: 'User not found', code: 'USER_NOT_FOUND' }
      }

      const user = result[0]
      return {
        success: true,
        data: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      }
    } catch (error: any) {
      console.error('Get user error:', error)
      return { success: false, error: 'An error occurred', code: 'GET_USER_ERROR' }
    }
  },

  async refresh(refreshToken: string): Promise<ApiResponse<any>> {
    try {
      const tokens = refreshAccessToken(refreshToken)
      
      if (!tokens) {
        return { success: false, error: 'Invalid refresh token', code: 'INVALID_REFRESH_TOKEN' }
      }

      return {
        success: true,
        data: {
          token: tokens.token,
          expiresIn: tokens.expiresIn,
        },
      }
    } catch (error: any) {
      console.error('Refresh token error:', error)
      return { success: false, error: 'An error occurred', code: 'REFRESH_ERROR' }
    }
  },

  async logout(token: string): Promise<ApiResponse<any>> {
    try {
      revokeToken(token)
      return { success: true, message: 'Logged out successfully' }
    } catch (error: any) {
      console.error('Logout error:', error)
      return { success: false, error: 'An error occurred', code: 'LOGOUT_ERROR' }
    }
  },

  async changePassword(req: AuthRequest, oldPassword: string, newPassword: string): Promise<ApiResponse<any>> {
    try {
      if (!req.user?.id) {
        return { success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' }
      }

      if (newPassword.length < 8) {
        return { success: false, error: 'Password must be at least 8 characters', code: 'WEAK_PASSWORD' }
      }

      const result = await db.select().from(users).where(eq(users.id, req.user.id))
      
      if (result.length === 0) {
        return { success: false, error: 'User not found', code: 'USER_NOT_FOUND' }
      }

      const user = result[0]
      const passwordParts = user.password.split(':')
      const storedHash = passwordParts[0]
      const salt = passwordParts[1] || ''
      const isValid = verifyPassword(oldPassword, storedHash, salt)

      if (!isValid) {
        return { success: false, error: 'Current password is incorrect', code: 'INVALID_PASSWORD' }
      }

      const { hashPassword } = await import('../utils/security.js')
      const { hash, salt: newSalt } = hashPassword(newPassword)
      const hashedPasswordWithSalt = `${hash}:${newSalt}`

      await db.update(users).set({ password: hashedPasswordWithSalt, updatedAt: new Date() }).where(eq(users.id, req.user.id))
      
      revokeAllUserTokens(req.user.id)

      return { success: true, message: 'Password changed successfully' }
    } catch (error: any) {
      console.error('Change password error:', error)
      return { success: false, error: 'An error occurred', code: 'CHANGE_PASSWORD_ERROR' }
    }
  },
}
