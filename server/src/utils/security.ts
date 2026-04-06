import crypto from 'crypto'

const ITERATIONS = 100000
const KEY_LENGTH = 64
const DIGEST = 'sha512'

export function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const generatedSalt = salt || crypto.randomBytes(32).toString('hex')
  const hash = crypto
    .pbkdf2Sync(password, generatedSalt, ITERATIONS, KEY_LENGTH, DIGEST)
    .toString('hex')
  return { hash, salt: generatedSalt }
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  const { hash: computedHash } = hashPassword(password, salt)
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(computedHash))
}

export function generateToken(length = 64): string {
  return crypto.randomBytes(length).toString('hex')
}

export function generateCSRFToken(): string {
  return crypto.randomBytes(32).toString('base64url')
}

export function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '')
    .substring(0, 255)
}

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email) && email.length <= 320
}
