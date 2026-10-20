import { createMiddleware } from 'hono/factory'
import { isValidObjectId } from 'mongoose'
import { forbidden, notFound } from '../lib/errors'
import { InvitationModel } from '../models'
import type { AppEnv } from '../types'

// Loads :id and lets only its owner or an admin through. Mount after requireAuth.
export const loadOwnInvitation = createMiddleware<AppEnv>(async (c, next) => {
  const id = c.req.param('id')
  if (!id || !isValidObjectId(id)) throw notFound('Invitation not found')
  const invitation = await InvitationModel.findById(id)
  if (!invitation) throw notFound('Invitation not found')
  const user = c.get('user')
  if (user.role !== 'admin' && !invitation.owner_id.equals(user.id)) throw forbidden()
  c.set('invitation', invitation)
  await next()
})
