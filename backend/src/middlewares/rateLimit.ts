import type { Context } from 'hono'
import { getConnInfo } from 'hono/bun'
import { rateLimiter } from 'hono-rate-limiter'
import type { AppEnv } from '../types'

// Railway and Render sit in front of the app and append the real client address to
// X-Forwarded-For. Earlier entries come from the client and can be forged, so the last one is used.
export function clientIp(c: Context) {
  const forwarded = c.req.header('x-forwarded-for')?.split(',').at(-1)?.trim()
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
