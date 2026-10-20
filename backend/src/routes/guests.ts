import { createRoute, z } from '@hono/zod-openapi'
import { bodyLimit } from 'hono/body-limit'
import type { QueryFilter } from 'mongoose'
import { AppError, badRequest, notFound } from '../lib/errors'
import { createRouter } from '../lib/router'
import { requireAuth } from '../middlewares/auth'
import { loadOwnInvitation } from '../middlewares/invitation'
import { GuestModel, type Guest } from '../models'
import type { Tier } from '../models/theme'
import { dataOf, errors, json, objectId, pageMeta, pageOf } from '../schemas/common'
import {
  guestBody,
  guestParams,
  guestSchema,
  guestUpdateBody,
  listGuestsQuery,
} from '../schemas/guest'
import { addGuests, parseGuestCsv, serializeGuest } from '../services/guest'
import { assertFeature } from '../services/plan'

const security = [{ bearerAuth: [] }]
const owner = [requireAuth, loadOwnInvitation]
const idParam = z.object({ id: objectId })

function escapeRegex(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

const list = createRoute({
  method: 'get',
  path: '/{id}/guests',
  tags: ['Guests'],
  summary: 'List guests with search, filter, sort and pagination',
  security,
  middleware: owner,
  request: { params: idParam, query: listGuestsQuery },
  responses: {
    200: json(pageOf(guestSchema), 'Guests'),
    401: errors[401],
    403: errors[403],
    404: errors[404],
  },
})

const create = createRoute({
  method: 'post',
  path: '/{id}/guests',
  tags: ['Guests'],
  summary: 'Add a guest and generate the personal link',
  security,
  middleware: owner,
  request: { params: idParam, body: json(guestBody, 'Guest') },
  responses: {
    201: json(dataOf(guestSchema), 'Guest added'),
    400: errors[400],
    401: errors[401],
    402: { description: 'Guest quota of the plan is used up' },
    403: errors[403],
  },
})

const importCsv = createRoute({
  method: 'post',
  path: '/{id}/guests/import',
  tags: ['Guests'],
  summary: 'Import guests from a CSV file (premium)',
  description:
    'Columns: name (required), phone, group, pax_quota. The whole file is rejected when any row is invalid.',
  security,
  middleware: [
    ...owner,
    bodyLimit({
      maxSize: 1024 * 1024,
      onError: () => {
        throw new AppError(413, 'PAYLOAD_TOO_LARGE', 'The CSV file must be 1 MB or smaller')
      },
    }),
  ],
  request: {
    params: idParam,
    body: {
      content: {
        'multipart/form-data': {
          schema: z.object({
            file: z.instanceof(File).openapi({ type: 'string', format: 'binary' }),
          }),
        },
      },
    },
  },
  responses: {
    201: json(dataOf(z.object({ imported: z.number(), guests: z.array(guestSchema) })), 'Imported'),
    400: { description: 'Invalid CSV, with the failing rows in details' },
    401: errors[401],
    402: { description: 'Not a premium invitation, or the quota would be exceeded' },
    403: errors[403],
  },
})

const update = createRoute({
  method: 'put',
  path: '/{id}/guests/{guestId}',
  tags: ['Guests'],
  summary: 'Update a guest',
  security,
  middleware: owner,
  request: { params: guestParams, body: json(guestUpdateBody, 'Fields to change') },
  responses: {
    200: json(dataOf(guestSchema), 'Guest updated'),
    400: errors[400],
    401: errors[401],
    403: errors[403],
    404: errors[404],
  },
})

const remove = createRoute({
  method: 'delete',
  path: '/{id}/guests/{guestId}',
  tags: ['Guests'],
  summary: 'Delete a guest',
  security,
  middleware: owner,
  request: { params: guestParams },
  responses: {
    200: json(dataOf(z.object({ id: z.string() })), 'Guest deleted'),
    401: errors[401],
    403: errors[403],
    404: errors[404],
  },
})

export function guestRoutes() {
  return createRouter()
    .openapi(list, async (c) => {
      const invitation = c.get('invitation')
      const { page, limit, q, group, opened, sort } = c.req.valid('query')
      const filter: QueryFilter<Guest> = { invitation_id: invitation._id }
      if (q) filter.name = { $regex: escapeRegex(q), $options: 'i' }
      if (group) filter.group = group
      if (opened) filter.opened_at = opened === 'true' ? { $ne: null } : null
      const [items, total] = await Promise.all([
        GuestModel.find(filter)
          .sort(sort)
          .skip((page - 1) * limit)
          .limit(limit),
        GuestModel.countDocuments(filter),
      ])
      return c.json(
        {
          data: items.map((g) => serializeGuest(invitation, g)),
          meta: pageMeta(page, limit, total),
        },
        200,
      )
    })
    .openapi(create, async (c) => {
      const invitation = c.get('invitation')
      const [guest] = await addGuests(invitation, [c.req.valid('json')])
      return c.json({ data: serializeGuest(invitation, guest!) }, 201)
    })
    .openapi(importCsv, async (c) => {
      const invitation = c.get('invitation')
      assertFeature(invitation.plan as Tier, 'csvImport')
      const { file } = c.req.valid('form')
      if (!file.name.toLowerCase().endsWith('.csv') && file.type !== 'text/csv') {
        throw badRequest('Upload a .csv file')
      }
      const guests = await addGuests(invitation, parseGuestCsv(await file.text()))
      return c.json(
        {
          data: {
            imported: guests.length,
            guests: guests.map((g) => serializeGuest(invitation, g)),
          },
        },
        201,
      )
    })
    .openapi(update, async (c) => {
      const invitation = c.get('invitation')
      const { guestId } = c.req.valid('param')
      const guest = await GuestModel.findOneAndUpdate(
        { _id: guestId, invitation_id: invitation._id },
        c.req.valid('json'),
        { returnDocument: 'after', runValidators: true },
      )
      if (!guest) throw notFound('Guest not found')
      return c.json({ data: serializeGuest(invitation, guest) }, 200)
    })
    .openapi(remove, async (c) => {
      const invitation = c.get('invitation')
      const { guestId } = c.req.valid('param')
      const guest = await GuestModel.findOneAndDelete({
        _id: guestId,
        invitation_id: invitation._id,
      })
      if (!guest) throw notFound('Guest not found')
      return c.json({ data: { id: guest.id as string } }, 200)
    })
}
