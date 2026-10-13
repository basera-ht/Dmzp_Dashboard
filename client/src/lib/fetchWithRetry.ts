/**
 * fetchWithRetry
 * Wraps the native `fetch` with:
 *  - An explicit AbortController timeout (default 25 s) so the browser
 *    doesn't silently hang on flaky mobile / webview connections.
 *  - Exponential-backoff retries (default 3 attempts, 1.5 s initial delay)
 *    to handle backend cold-starts (Render / Railway) and transient errors.
 *
 * Only network-level failures (TypeError / AbortError) and 5xx responses
 * trigger a retry. 4xx errors are returned immediately.
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
    ...fetchOptions
  } = options

  let lastError: unknown

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const controller = new AbortController()
    const timerId = setTimeout(() => controller.abort(), timeoutMs)

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal,
      })

      clearTimeout(timerId)

      // Don't retry client errors (4xx) — they won't change on retry.
      if (response.status >= 400 && response.status < 500) {
        return response
      }

      // 5xx server errors are retry-able.
      if (!response.ok && attempt < maxAttempts) {
        const backoff = initialBackoffMs * Math.pow(2, attempt - 1)
        console.warn(
          `[fetchWithRetry] Attempt ${attempt}/${maxAttempts} failed with status ${response.status}. Retrying in ${backoff}ms…`,
        )
        await sleep(backoff)
        lastError = new Error(`Server error: ${response.status}`)
        continue
      }

      return response
    } catch (err: unknown) {
      clearTimeout(timerId)
      lastError = err

      const isAbort = err instanceof DOMException && err.name === 'AbortError'
      const isNetwork = err instanceof TypeError

      if ((isAbort || isNetwork) && attempt < maxAttempts) {
        const backoff = initialBackoffMs * Math.pow(2, attempt - 1)
        console.warn(
          `[fetchWithRetry] Attempt ${attempt}/${maxAttempts} failed (${isAbort ? 'timeout' : 'network error'}). Retrying in ${backoff}ms…`,
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
