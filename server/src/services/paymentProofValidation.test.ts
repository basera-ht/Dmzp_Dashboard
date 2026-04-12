import { describe, expect, it } from 'vitest'
import {
  feesFromPaymentProof,
  isValidPaymentProof,
  normalizeProofText,
  resolvePaymentProof,
} from './paymentProofValidation.js'

const opts = { amount: '150', payeeParts: ['h', 'lalmuanpuia'] }

describe('normalizeProofText', () => {
  it('lowercases and collapses whitespace', () => {
    expect(normalizeProofText('  Hello   WORLD  ')).toBe('hello world')
  })
})

describe('isValidPaymentProof', () => {
  it('accepts canonical phrase', () => {
    expect(isValidPaymentProof('150 paid to h lalmuanpuia', opts)).toBe(true)
  })

  it('accepts Rs.150 style punctuation', () => {
    expect(isValidPaymentProof('Rs.150 paid to h lalmuanpuia', opts)).toBe(true)
  })

  it('accepts Google Drive URLs as valid proof', () => {
    expect(isValidPaymentProof('https://drive.google.com/open?id=1AbC_DeFgHiJkLmNoPqRsTuVwXyZ', opts)).toBe(true)
  })

  it('accepts Bethsy Lalduhkimi', () => {
    expect(isValidPaymentProof('150 paid to Bethsy Lalduhkimi', opts)).toBe(true)
  })

  it('accepts BethC ldk', () => {
    expect(isValidPaymentProof('150 paid to bethc ldk', opts)).toBe(true)
  })

  it('accepts completed status', () => {
    expect(isValidPaymentProof('150 completed to h lalmuanpuia', opts)).toBe(true)
  })

  it('accepts successful status', () => {
    expect(isValidPaymentProof('150 successful to h lalmuanpuia', opts)).toBe(true)
  })

  it('accepts with a checkmark', () => {
    expect(isValidPaymentProof('150 ✓ to h lalmuanpuia', opts)).toBe(true)
  })

  it('rejects wrong amount', () => {
    expect(isValidPaymentProof('200 paid to h lalmuanpuia', opts)).toBe(false)
  })

  it('rejects 1150 without standalone 150', () => {
    expect(isValidPaymentProof('1150 paid to h lalmuanpuia', opts)).toBe(false)
  })

  it('rejects missing payee part', () => {
    // Note: since we have hardcoded treasurers, this will only fail if it doesn't match any of them
    // and also doesn't match the opts.payeeParts
    const badOpts = { amount: '150', payeeParts: ['unknown', 'payee'] }
    expect(isValidPaymentProof('150 paid to unknown only', badOpts)).toBe(false)
  })

  it('rejects without valid connector (paid/completed/checkmark)', () => {
    expect(isValidPaymentProof('150 to h lalmuanpuia', opts)).toBe(false)
  })

  it('rejects empty', () => {
    expect(isValidPaymentProof('', opts)).toBe(false)
  })
})

describe('feesFromPaymentProof', () => {
  it('strict off: nonempty is yes', () => {
    expect(feesFromPaymentProof('anything', false, opts)).toBe('yes')
  })

  it('strict off: empty is no', () => {
    expect(feesFromPaymentProof('   ', false, opts)).toBe('no')
  })
})

describe('resolvePaymentProof', () => {
  it('strict: valid', () => {
    expect(resolvePaymentProof('150 paid to h lalmuanpuia', true, opts)).toEqual({
      fees: 'yes',
      paymentProofStatus: 'valid',
    })
  })

  it('strict: empty', () => {
    expect(resolvePaymentProof('', true, opts)).toEqual({
      fees: 'no',
      paymentProofStatus: 'empty',
    })
  })

  it('strict: invalid', () => {
    expect(resolvePaymentProof('nope', true, opts)).toEqual({
      fees: 'no',
      paymentProofStatus: 'invalid',
    })
  })

  it('strict off: no paymentProofStatus', () => {
    expect(resolvePaymentProof('x', false, opts)).toEqual({ fees: 'yes' })
  })
})
