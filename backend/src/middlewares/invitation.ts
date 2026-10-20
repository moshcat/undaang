import { createMiddleware } from 'hono/factory'
import { findOwnedInvitation } from '../services/invitation'
import type { AppEnv } from '../types'

// Loads :id and lets only its owner or an admin through. Mount after requireAuth.
export const loadOwnInvitation = createMiddleware<AppEnv>(async (c, next) => {
  c.set('invitation', await findOwnedInvitation(c.get('user'), c.req.param('id')))
  await next()
})
