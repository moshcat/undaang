import { createMiddleware } from 'hono/factory'
import { forbidden, unauthorized } from '../lib/errors'
import { verifyToken } from '../lib/jwt'
import type { AppEnv, Role } from '../types'

export const requireAuth = createMiddleware<AppEnv>(async (c, next) => {
  const header = c.req.header('Authorization')
  if (!header?.startsWith('Bearer ')) throw unauthorized()
  try {
    c.set('user', await verifyToken(header.slice('Bearer '.length)))
  } catch {
    throw unauthorized('Invalid or expired token')
  }
  await next()
})

export const requireRole = (role: Role) =>
  createMiddleware<AppEnv>(async (c, next) => {
    if (c.get('user').role !== role) throw forbidden()
    await next()
  })
