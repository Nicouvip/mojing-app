/**
 * 带超时和重试的 fetch 封装
 * 自动重试3次（1s→2s→4s间隔递增），仅重试网络错误和5xx，4xx不重试
 */

// ===== 自定义错误（携带重试次数） =====

export class FetchRetryError extends Error {
  retryCount: number
  status?: number

  constructor(message: string, retryCount: number, status?: number) {
    super(message)
    this.name = 'FetchRetryError'
    this.retryCount = retryCount
    this.status = status
  }
}

export interface RetryOptions {
  /** 最大重试次数（默认3，含首次请求） */
  maxRetries?: number
  /** 每次重试前的回调，attempt 从1开始（首次不算重试），total为最大次数 */
  onRetry?: (attempt: number, total: number) => void
}

export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = 30_000,
  retryOptions?: RetryOptions,
): Promise<Response> {
  const { maxRetries = 3, onRetry } = retryOptions ?? {}
  let lastError: Error | null = null
  let lastResponse: Response | null = null

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      })

      // 4xx 不重试，直接返回
      if (response.status >= 400 && response.status < 500) {
        return response
      }

      // 5xx 重试
      if (response.status >= 500) {
        lastResponse = response
        lastError = new FetchRetryError(
          `服务错误 (HTTP ${response.status})`,
          attempt,
          response.status,
        )
        if (attempt < maxRetries) {
          onRetry?.(attempt, maxRetries)
          await sleep(Math.pow(2, attempt - 1) * 1000) // 1s → 2s → 4s
          continue
        }
        return response
      }

      // 2xx/3xx 成功
      return response
    } catch (e) {
      // 网络错误（超时、DNS失败、连接拒绝等）
      if (e instanceof DOMException && e.name === 'AbortError') {
        lastError = new FetchRetryError('请求超时', attempt)
      } else {
        lastError = e instanceof Error ? e : new Error('网络请求失败')
        if (!(lastError instanceof FetchRetryError)) {
          lastError = new FetchRetryError(lastError.message, attempt)
        }
      }
      if (attempt < maxRetries) {
        onRetry?.(attempt, maxRetries)
        await sleep(Math.pow(2, attempt - 1) * 1000) // 1s → 2s → 4s
        continue
      }
      throw lastError
    } finally {
      clearTimeout(timer)
    }
  }

  throw lastError ?? new FetchRetryError('请求失败', maxRetries)
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
