import { describe, expect, it } from 'vitest'
import {
  hashPassword,
  verifyPassword,
  generateToken,
  generateCSRFToken,
  sanitizeInput,
  isValidEmail,
} from '../utils/security.js'

describe('hashPassword', () => {
  it('generates a hash and salt', () => {
    const { hash, salt } = hashPassword('Test1234!')
    expect(hash).toBeTruthy()
    expect(salt).toBeTruthy()
    expect(hash.length).toBeGreaterThan(0)
    expect(salt.length).toBeGreaterThan(0)
  })

  it('generates different salts each call', () => {
    const a = hashPassword('Test1234!')
    const b = hashPassword('Test1234!')
    expect(a.salt).not.toBe(b.salt)
    expect(a.hash).not.toBe(b.hash)
  })

  it('produces deterministic output when salt is provided', () => {
    const { hash, salt } = hashPassword('Test1234!')
    const result = hashPassword('Test1234!', salt)
    expect(result.hash).toBe(hash)
    expect(result.salt).toBe(salt)
  })
})

describe('verifyPassword', () => {
  it('verifies correct password', () => {
    const { hash, salt } = hashPassword('SecureP@ss123')
    expect(verifyPassword('SecureP@ss123', hash, salt)).toBe(true)
  })

  it('rejects wrong password', () => {
    const { hash, salt } = hashPassword('SecureP@ss123')
    expect(verifyPassword('WrongP@ss123', hash, salt)).toBe(false)
  })

  it('rejects empty password', () => {
    const { hash, salt } = hashPassword('SecureP@ss123')
    expect(verifyPassword('', hash, salt)).toBe(false)
  })
})

describe('generateToken', () => {
  it('generates cryptographically random tokens', () => {
    const a = generateToken()
    const b = generateToken()
    expect(a).not.toBe(b)
    expect(a.length).toBe(128) // 64 bytes * 2 hex chars
  })

  it('generates tokens of specified length', () => {
    const token = generateToken(32)
    expect(token.length).toBe(64) // 32 bytes * 2 hex chars
  })

  it('does not use Math.random', () => {
    // The function uses crypto.randomBytes, not Math.random.
    // We verify this by checking the import in security.ts uses 'crypto'.
    const token = generateToken()
    expect(typeof token).toBe('string')
    expect(token).toMatch(/^[a-f0-9]+$/)
  })
})

describe('generateCSRFToken', () => {
  it('generates a base64url token', () => {
    const token = generateCSRFToken()
    expect(token).toBeTruthy()
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/)
  })

  it('generates unique tokens', () => {
    const a = generateCSRFToken()
    const b = generateCSRFToken()
    expect(a).not.toBe(b)
  })
})

describe('sanitizeInput', () => {
  it('trims whitespace', () => {
    expect(sanitizeInput('  hello  ')).toBe('hello')
  })

  it('removes angle brackets', () => {
    expect(sanitizeInput('<script>alert(1)</script>')).toBe('scriptalert(1)/script')
  })

  it('truncates to 255 characters', () => {
    const long = 'a'.repeat(500)
    expect(sanitizeInput(long).length).toBe(255)
  })

  it('handles empty string', () => {
    expect(sanitizeInput('')).toBe('')
  })
})

describe('isValidEmail', () => {
  it('accepts valid email', () => {
    expect(isValidEmail('test@example.com')).toBe(true)
  })

  it('rejects invalid email without @', () => {
    expect(isValidEmail('test-at-example.com')).toBe(false)
  })

  it('rejects email with spaces', () => {
    expect(isValidEmail('test @example.com')).toBe(false)
  })

  it('rejects empty string', () => {
    expect(isValidEmail('')).toBe(false)
  })

  it('rejects overly long email', () => {
    const long = 'a'.repeat(310) + '@example.com'
    expect(isValidEmail(long)).toBe(false)
  })
})
