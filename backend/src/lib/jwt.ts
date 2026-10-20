import { sign, verify } from 'hono/jwt'
import { env } from '../config/env'
import type { AuthUser, Role } from '../types'

export const TOKEN_TTL_SECONDS = 60 * 60 * 24

export function signToken(user: AuthUser) {
  const now = Math.floor(Date.now() / 1000)
  return sign(
    { sub: user.id, role: user.role, iat: now, exp: now + TOKEN_TTL_SECONDS },
    env().JWT_SECRET,
    'HS256',
  )
}

export async function verifyToken(token: string): Promise<AuthUser> {
  const payload = await verify(token, env().JWT_SECRET, 'HS256')
  if (typeof payload.sub !== 'string' || (payload.role !== 'admin' && payload.role !== 'user')) {
    throw new Error('Malformed token payload')
  }
  return { id: payload.sub, role: payload.role as Role }
}
