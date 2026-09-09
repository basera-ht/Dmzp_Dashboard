import { describe, expect, it } from 'vitest'
import { pagination } from './requestValidation.js'

function mockReq(query: Record<string, string> = {}) {
  return { query } as any
}

describe('pagination', () => {
  it('returns defaults when no query params', () => {
    const result = pagination(mockReq())
    expect(result).toEqual({ page: 1, limit: 10 })
  })

  it('parses page and limit from query', () => {
    const result = pagination(mockReq({ page: '3', limit: '25' }))
    expect(result).toEqual({ page: 3, limit: 25 })
  })

  it('enforces max limit', () => {
    const result = pagination(mockReq({ page: '1', limit: '500' }))
    expect(result).toEqual({ page: 1, limit: 100 })
  })

  it('returns null for non-numeric page', () => {
    const result = pagination(mockReq({ page: 'abc' }))
    expect(result).toBeNull()
  })

  it('returns null for page < 1', () => {
    const result = pagination(mockReq({ page: '0' }))
    expect(result).toBeNull()
  })

  it('returns null for negative limit', () => {
    const result = pagination(mockReq({ limit: '-5' }))
    expect(result).toBeNull()
  })

  it('returns null for NaN limit', () => {
    const result = pagination(mockReq({ limit: 'xyz' }))
    expect(result).toBeNull()
  })

  it('uses custom default limit', () => {
    const result = pagination(mockReq(), 50)
    expect(result).toEqual({ page: 1, limit: 50 })
  })

  it('uses custom max limit', () => {
    const result = pagination(mockReq({ limit: '200' }), 10, 50)
    expect(result).toEqual({ page: 1, limit: 50 })
  })

  it('returns null for float page', () => {
    const result = pagination(mockReq({ page: '1.5' }))
    expect(result).toBeNull()
  })
})
