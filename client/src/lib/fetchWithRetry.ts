/**
 * fetchWithRetry
 * Wraps the native `fetch` with:
 *  - An explicit AbortController timeout (default 25 s) so the browser
 *    doesn't silently hang on flaky mobile / webview connections.
 *  - Exponential-backoff retries (default 3 attempts, 1.5 s initial delay)
 *    for GET/HEAD/OPTIONS/PUT/DELETE only. POST and PATCH are non-idempotent
 *    and are never automatically retried to prevent duplicate side-effects.
 *
 * Only network-level failures (TypeError / AbortError) and 5xx responses
 * trigger a retry. 4xx errors are returned immediately.
 *
 * If a caller-supplied AbortSignal aborts, the retry loop stops immediately
 * and the AbortError is re-thrown (not treated as a timeout).
 */

export interface FetchWithRetryOptions extends RequestInit {
  /** Timeout in milliseconds before aborting a single attempt. Default: 25_000 */
  timeoutMs?: number
  /** Maximum number of total attempts (1 = no retries). Default: 3 */
  maxAttempts?: number
  /** Initial backoff delay in milliseconds. Doubles each attempt. Default: 1_500 */
  initialBackoffMs?: number
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms))
}

/** HTTP methods that are safe to retry automatically (idempotent). */
const IDEMPOTENT_METHODS = new Set(['GET', 'HEAD', 'OPTIONS', 'PUT', 'DELETE'])

/**
 * Returns a user-friendly message for network/fetch errors that would otherwise
 * show raw browser internals like "Failed to fetch" or "Load failed".
 */
export function friendlyNetworkError(err: unknown): string {
  if (err instanceof DOMException && err.name === 'AbortError') {
    return 'Connection timed out. Please check your internet connection and try again.'
  }
  if (err instanceof TypeError) {
    // "Failed to fetch" (Chrome/Android) / "Load failed" (Safari/iOS)
    return 'Connection interrupted. Please verify your connection or tap Retry.'
  }
  if (err instanceof Error) return err.message
  return 'An unexpected network error occurred. Please try again.'
}

export async function fetchWithRetry(
  url: string,
  options: FetchWithRetryOptions = {},
): Promise<Response> {
  const {
    timeoutMs = 25_000,
    maxAttempts = 3,
    initialBackoffMs = 1_500,
    signal: callerSignal,
    ...fetchOptions
  } = options

  // Non-idempotent methods must never be retried automatically.
  const method = (fetchOptions.method ?? 'GET').toUpperCase()
  const canRetry = IDEMPOTENT_METHODS.has(method)
  const effectiveMaxAttempts = canRetry ? maxAttempts : 1

  // Surface caller cancellation immediately throughout the loop.
  if (callerSignal?.aborted) throw callerSignal.reason ?? new DOMException('Aborted', 'AbortError')

  let lastError: unknown

  for (let attempt = 1; attempt <= effectiveMaxAttempts; attempt++) {
    // Stop if the caller has cancelled between attempts.
    if (callerSignal?.aborted) throw callerSignal.reason ?? new DOMException('Aborted', 'AbortError')

    const controller = new AbortController()
    // Link caller signal → internal controller so the caller can cancel.
    let callerAbortHandler: (() => void) | undefined
    if (callerSignal) {
      callerAbortHandler = () => controller.abort(callerSignal.reason)
      callerSignal.addEventListener('abort', callerAbortHandler, { once: true })
    }
    // The timeout applies to the full fetch (headers + stream initiation).
    // Body reads happen after the Response is returned and share the same
    // controller signal, so they will also be aborted on timeout.
    const timerId = setTimeout(() => controller.abort(new DOMException('Timeout', 'AbortError')), timeoutMs)

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal,
      })

      clearTimeout(timerId)
      callerAbortHandler && callerSignal?.removeEventListener('abort', callerAbortHandler)

      // Don't retry client errors (4xx) — they won't change on retry.
      if (response.status >= 400 && response.status < 500) {
        return response
      }

      // 5xx server errors are retry-able for idempotent methods.
      if (!response.ok && attempt < effectiveMaxAttempts) {
        const backoff = initialBackoffMs * Math.pow(2, attempt - 1)
        console.warn(
          `[fetchWithRetry] Attempt ${attempt}/${effectiveMaxAttempts} failed with status ${response.status}. Retrying in ${backoff}ms…`,
        )
        await sleep(backoff)
        lastError = new Error(`Server error: ${response.status}`)
        continue
      }

      return response
    } catch (err: unknown) {
      clearTimeout(timerId)
      callerAbortHandler && callerSignal?.removeEventListener('abort', callerAbortHandler)
      lastError = err

      const isAbort = err instanceof DOMException && err.name === 'AbortError'
      const isNetwork = err instanceof TypeError

      // If the caller signal triggered the abort, propagate immediately — do not retry.
      if (isAbort && callerSignal?.aborted) throw err

      if ((isAbort || isNetwork) && attempt < effectiveMaxAttempts) {
        const backoff = initialBackoffMs * Math.pow(2, attempt - 1)
        console.warn(
          `[fetchWithRetry] Attempt ${attempt}/${effectiveMaxAttempts} failed (${isAbort ? 'timeout' : 'network error'}). Retrying in ${backoff}ms…`,
        )
        await sleep(backoff)
        continue
      }

      // Either we've exhausted retries or it's a non-retriable error.
      throw err
    }
  }

  // We only reach here if all retry attempts resulted in 5xx responses.
  throw lastError
}

