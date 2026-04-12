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

export function isValidPaymentProof(raw: string, opts: PaymentProofValidationOpts): boolean {
  const t = normalizeProofText(raw)
  if (!t) return false

  // Detect URLs or common file extensions (e.g. Google Drive links from file uploads)
  const trimmed = raw.trim()
  if (/https?:\/\/[^\s]+/.test(trimmed) || /\.(jpe?g|png|pdf|heic)$/i.test(trimmed)) {
    return true
  }

  // Standard text-based validation fallback
  if (!t.includes('paid')) return false

  const m = alphanumericSpaced(raw)
  const amountEsc = opts.amount.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const amountRe = new RegExp(`\\b${amountEsc}\\b`)
  if (!amountRe.test(m)) return false

  const parts = opts.payeeParts.map((p) => p.trim().toLowerCase()).filter(Boolean)
  for (const p of parts) {
    if (!t.includes(p)) return false
  }

  return true
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
