import type { Context } from 'hono'
import { getConnInfo } from 'hono/bun'
import { rateLimiter } from 'hono-rate-limiter'
import type { AppEnv } from '../types'

// Railway and Render put the client address in X-Forwarded-For; the socket address is the proxy.
export function clientIp(c: Context) {
  const forwarded = c.req.header('x-forwarded-for')?.split(',')[0]?.trim()
  if (forwarded) return forwarded
  try {
    return getConnInfo(c).remote.address ?? 'unknown'
  } catch {
    return 'unknown'
  }
}

export function limitByIp(options: { windowMs: number; limit: number }) {
  return rateLimiter<AppEnv>({
    windowMs: options.windowMs,
    limit: options.limit,
    standardHeaders: 'draft-6',
    keyGenerator: clientIp,
    message: {
      error: { code: 'TOO_MANY_REQUESTS', message: 'Too many requests, try again later' },
    },
  })
}
