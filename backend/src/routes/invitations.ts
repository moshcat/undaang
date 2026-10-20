import { createRoute, z } from '@hono/zod-openapi'
import { createRouter } from '../lib/router'
import { requireAuth } from '../middlewares/auth'
import { loadOwnInvitation } from '../middlewares/invitation'
import { InvitationModel } from '../models'
import { dataOf, errors, json, objectId, pageMeta, pageOf } from '../schemas/common'
import {
  createInvitationBody,
  invitationSchema,
  listInvitationsQuery,
  publishBody,
  updateInvitationBody,
} from '../schemas/invitation'
import {
  applyUpdate,
  assertSlugFree,
  deleteInvitation,
  findActiveTheme,
  serializeInvitation,
  setPublished,
} from '../services/invitation'
import { assertThemeAllowed, initialExpiry } from '../services/plan'

const security = [{ bearerAuth: [] }]
const idParam = z.object({ id: objectId })

const list = createRoute({
  method: 'get',
  path: '/',
  tags: ['Invitations'],
  summary: 'List my invitations',
  security,
  middleware: [requireAuth],
  request: { query: listInvitationsQuery },
  responses: { 200: json(pageOf(invitationSchema), 'Invitations'), 401: errors[401] },
})

const create = createRoute({
  method: 'post',
  path: '/',
  tags: ['Invitations'],
  summary: 'Create a draft invitation on the free plan',
  security,
  middleware: [requireAuth],
  request: { body: json(createInvitationBody, 'Slug, theme and couple names') },
  responses: {
    201: json(dataOf(invitationSchema), 'Invitation created'),
    400: errors[400],
    401: errors[401],
    402: errors[402],
    409: { description: 'Slug is already taken' },
  },
})

const detail = createRoute({
  method: 'get',
  path: '/{id}',
  tags: ['Invitations'],
  summary: 'Invitation detail for the editor',
  security,
  middleware: [requireAuth, loadOwnInvitation],
  request: { params: idParam },
  responses: {
    200: json(dataOf(invitationSchema), 'Invitation'),
    401: errors[401],
    403: errors[403],
    404: errors[404],
  },
})

const update = createRoute({
  method: 'put',
  path: '/{id}',
  tags: ['Invitations'],
  summary: 'Update content, theme and settings',
  description: 'Each section sent replaces the stored one. Sections left out stay unchanged.',
  security,
  middleware: [requireAuth, loadOwnInvitation],
  request: { params: idParam, body: json(updateInvitationBody, 'Sections to replace') },
  responses: {
    200: json(dataOf(invitationSchema), 'Invitation updated'),
    400: errors[400],
    401: errors[401],
    402: errors[402],
    403: errors[403],
    404: errors[404],
    409: { description: 'Slug is already taken' },
  },
})

const publish = createRoute({
  method: 'patch',
  path: '/{id}/publish',
  tags: ['Invitations'],
  summary: 'Publish or unpublish',
  security,
  middleware: [requireAuth, loadOwnInvitation],
  request: { params: idParam, body: json(publishBody, 'Target state') },
  responses: {
    200: json(dataOf(invitationSchema), 'Status changed'),
    401: errors[401],
    402: errors[402],
    403: { description: 'Not the owner, or the invitation is suspended' },
    404: errors[404],
    422: errors[422],
  },
})

const remove = createRoute({
  method: 'delete',
  path: '/{id}',
  tags: ['Invitations'],
  summary: 'Delete an invitation with its guests and RSVPs',
  security,
  middleware: [requireAuth, loadOwnInvitation],
  request: { params: idParam },
  responses: {
    200: json(dataOf(z.object({ id: z.string() })), 'Deleted'),
    401: errors[401],
    403: errors[403],
    404: errors[404],
  },
})

export function invitationRoutes() {
  return createRouter()
    .openapi(list, async (c) => {
      const { page, limit, status } = c.req.valid('query')
      const filter = { owner_id: c.get('user').id, ...(status && { status }) }
      const [items, total] = await Promise.all([
        InvitationModel.find(filter)
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit),
        InvitationModel.countDocuments(filter),
      ])
      return c.json(
        { data: items.map(serializeInvitation), meta: pageMeta(page, limit, total) },
        200,
      )
    })
    .openapi(create, async (c) => {
      const body = c.req.valid('json')
      const theme = await findActiveTheme(body.theme_id)
      assertThemeAllowed('free', theme.tier)
      await assertSlugFree(body.slug)
      const invitation = await InvitationModel.create({
        owner_id: c.get('user').id,
        slug: body.slug,
        theme_id: theme._id,
        plan: 'free',
        plan_expires_at: initialExpiry(),
        couple: body.couple,
        settings: { primary_color: theme.defaults?.primary_color ?? null },
      })
      return c.json({ data: serializeInvitation(invitation) }, 201)
    })
    .openapi(detail, (c) => c.json({ data: serializeInvitation(c.get('invitation')) }, 200))
    .openapi(update, async (c) => {
      const invitation = c.get('invitation')
      await applyUpdate(invitation, c.req.valid('json'))
      return c.json({ data: serializeInvitation(invitation) }, 200)
    })
    .openapi(publish, async (c) => {
      const invitation = c.get('invitation')
      await setPublished(invitation, c.req.valid('json').published)
      return c.json({ data: serializeInvitation(invitation) }, 200)
    })
    .openapi(remove, async (c) => {
      const invitation = c.get('invitation')
      await deleteInvitation(invitation)
      return c.json({ data: { id: invitation.id as string } }, 200)
    })
}
