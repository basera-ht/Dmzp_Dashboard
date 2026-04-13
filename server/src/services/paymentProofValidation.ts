export type PaymentProofStatus = 'valid' | 'empty' | 'invalid'

export interface PaymentProofValidationOpts {
  amount: string
  payeeParts: string[]
}

export function normalizeProofText(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ')
}

function alphanumericSpaced(s: string): string {
  return normalizeProofText(s).replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim()
}

/**
 * Known DMZP treasurer identifiers.
 * Each entry is a group — any ONE group matching = valid treasurer.
 */
const TREASURER_GROUPS = [
  // H Lalmuanpuia — name match
  { words: ['h', 'lalmuanpuia'] },
  { words: ['hlalmuanpuia'] },
  // Bethsy Lalduhkimi — name match
  { words: ['bethsy', 'lalduhkimi'] },
  { words: ['bethsy'] },
  { words: ['bethc', 'ldk'] },
  // H Lalmuanpuia — UPI / phone number identifiers (Paytm)
  { words: ['8920446062'] },
  { words: ['89204 46062'] },
  { words: ['8920446062@ptsbi'] },
  // Bethsy — phone number (add if known)
]

function containsTreasurerIdentifier(t: string): boolean {
  // Normalize: remove all spaces for phone-number matching too
  const compact = t.replace(/\s+/g, '')
  return TREASURER_GROUPS.some(group =>
    group.words.every(word => t.includes(word) || compact.includes(word.replace(/\s/g, '')))
  )
}

export function isValidPaymentProof(raw: string, opts: PaymentProofValidationOpts): boolean {
  const t = normalizeProofText(raw)
  if (!t) return false

  // ── Pass 1: URL or file attachment ───────────────────────────────────────
  const trimmed = raw.trim()
  if (/https?:\/\/[^\s]+/.test(trimmed) || /\.(jpe?g|png|pdf|heic)$/i.test(trimmed)) {
    return true
  }

  // ── Pass 2: UPI ID containing a known treasurer phone/id ─────────────────
  // e.g. "8920446062@ptsbi" — by itself is strong enough proof
  const upiPattern = /\d{10}@\w+/
  if (upiPattern.test(t) && containsTreasurerIdentifier(t)) {
    return true
  }

  // ── Pass 3: Amount alone (₹150 or "150") + treasurer identifier ──────────
  // Handles: "Payment to HLalmuanpuia puia ₹150 Paid 1:05am"
  //          "Paid 150 to hlalmuanpuia"
  //          "transferred 150 to 8920446062"
  const m = alphanumericSpaced(raw)
  const amountEsc = opts.amount.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const amountRe = new RegExp(`\\b${amountEsc}\\b`)
  const hasAmount = amountRe.test(m)

  if (hasAmount && containsTreasurerIdentifier(t)) {
    // Amount + treasurer = valid, no "paid" keyword required
    return true
  }

  // ── Pass 4: Full strict validation (paid keyword + amount + treasurer) ────
  const hasPaidMarker = (
    t.includes('paid') ||
    t.includes('completed') ||
    t.includes('successful') ||
    t.includes('transferred') ||
    t.includes('sent') ||
    t.includes('✓') ||
    t.includes('✅')
  )

  if (!hasPaidMarker) return false
  if (!hasAmount) return false

  // Check treasurer name or legacy payeeParts
  if (containsTreasurerIdentifier(t)) return true

  // Legacy fallback: check opts.payeeParts (from .env PAYMENT_PROOF_PAYEE_PARTS)
  const parts = opts.payeeParts.map((p) => p.trim().toLowerCase()).filter(Boolean)
  if (parts.length > 0 && parts.every(p => t.includes(p))) return true

  return false
}

export function feesFromPaymentProof(
  raw: string,
  strict: boolean,
  opts: PaymentProofValidationOpts
): 'yes' | 'no' {
  return resolvePaymentProof(raw, strict, opts).fees
}

export function resolvePaymentProof(
  raw: string,
  strict: boolean,
  opts: PaymentProofValidationOpts
): { fees: 'yes' | 'no'; paymentProofStatus?: PaymentProofStatus } {
  const trimmed = raw.trim()
  if (!strict) {
    if (!trimmed) return { fees: 'no' }
    return { fees: 'yes' }
  }
  if (!trimmed) return { fees: 'no', paymentProofStatus: 'empty' }
  if (isValidPaymentProof(trimmed, opts)) {
    return { fees: 'yes', paymentProofStatus: 'valid' }
  }
  return { fees: 'no', paymentProofStatus: 'invalid' }
}
