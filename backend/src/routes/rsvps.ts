import { createRoute, z } from '@hono/zod-openapi'
import type { QueryFilter } from 'mongoose'
import Papa from 'papaparse'
import { notFound } from '../lib/errors'
import { createRouter } from '../lib/router'
import { requireAuth } from '../middlewares/auth'
import { loadOwnInvitation } from '../middlewares/invitation'
import { RsvpModel, type Rsvp } from '../models'
import type { Tier } from '../models/theme'
import {
  dataOf,
  errors,
  json,
  objectId,
  pageMeta,
  pageOf,
  paginationQuery,
} from '../schemas/common'
import { assertFeature } from '../services/plan'

const security = [{ bearerAuth: [] }]
const owner = [requireAuth, loadOwnInvitation]
const attendance = z.enum(['hadir', 'tidak_hadir', 'ragu'])

const rsvpSchema = z
  .object({
    id: z.string(),
    invitation_id: z.string(),
    guest_id: z.string().nullable(),
    name: z.string(),
    attendance,
    pax: z.number(),
    message: z.string(),
    is_hidden: z.boolean(),
    createdAt: z.iso.datetime(),
  })
  .openapi('Rsvp')

const list = createRoute({
  method: 'get',
  path: '/{id}/rsvps',
  tags: ['RSVPs'],
  summary: 'List RSVPs and wishes',
  security,
  middleware: owner,
  request: {
    params: z.object({ id: objectId }),
    query: paginationQuery.extend({
      attendance: attendance.optional(),
      q: z.string().trim().max(100).optional(),
      hidden: z.enum(['true', 'false']).optional(),
    }),
  },
  responses: {
    200: json(pageOf(rsvpSchema), 'RSVPs'),
    401: errors[401],
    403: errors[403],
    404: errors[404],
  },
})

const moderate = createRoute({
  method: 'patch',
  path: '/{id}/rsvps/{rsvpId}',
  tags: ['RSVPs'],
  summary: 'Hide or show a wish on the public page',
  security,
  middleware: owner,
  request: {
    params: z.object({ id: objectId, rsvpId: objectId }),
    body: json(z.object({ is_hidden: z.boolean() }), 'Visibility'),
  },
  responses: {
    200: json(dataOf(rsvpSchema), 'RSVP updated'),
    401: errors[401],
    403: errors[403],
    404: errors[404],
  },
})

const exportCsv = createRoute({
  method: 'get',
  path: '/{id}/rsvps/export',
  tags: ['RSVPs'],
  summary: 'Download every RSVP as CSV (premium)',
  security,
  middleware: owner,
  request: { params: z.object({ id: objectId }) },
  responses: {
    200: { content: { 'text/csv': { schema: z.string() } }, description: 'CSV file' },
    401: errors[401],
    402: errors[402],
    403: errors[403],
  },
})

function escapeRegex(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Spreadsheet apps run cells that start with these characters as formulas.
function safeCell(value: string) {
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value
}

export function rsvpRoutes() {
  return createRouter()
    .openapi(list, async (c) => {
      const invitation = c.get('invitation')
      const { page, limit, attendance, q, hidden } = c.req.valid('query')
      const filter: QueryFilter<Rsvp> = { invitation_id: invitation._id }
      if (attendance) filter.attendance = attendance
      if (q) filter.name = { $regex: escapeRegex(q), $options: 'i' }
      if (hidden) filter.is_hidden = hidden === 'true'
      const [items, total] = await Promise.all([
        RsvpModel.find(filter)
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit),
        RsvpModel.countDocuments(filter),
      ])
      return c.json({ data: items.map((r) => r.toJSON()), meta: pageMeta(page, limit, total) }, 200)
    })
    .openapi(exportCsv, async (c) => {
      const invitation = c.get('invitation')
      assertFeature(invitation.plan as Tier, 'rsvpExport')
      const rsvps = await RsvpModel.find({ invitation_id: invitation._id })
        .sort({ createdAt: 1, _id: 1 })
        .populate<{ guest_id: { group: string | null } | null }>('guest_id', 'group')
      const csv = Papa.unparse({
        fields: ['name', 'group', 'attendance', 'pax', 'message', 'hidden', 'submitted_at'],
        data: rsvps.map((r) => [
          safeCell(r.name),
          safeCell(r.guest_id?.group ?? ''),
          r.attendance,
          r.pax,
          safeCell(r.message),
          r.is_hidden ? 'yes' : 'no',
          r.createdAt.toISOString(),
        ]),
      })
      // The BOM makes Excel read the file as UTF-8.
      return c.body(`\uFEFF${csv}`, 200, {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="rsvp-${invitation.slug}.csv"`,
      })
    })
    .openapi(moderate, async (c) => {
      const invitation = c.get('invitation')
      const { rsvpId } = c.req.valid('param')
      const rsvp = await RsvpModel.findOneAndUpdate(
        { _id: rsvpId, invitation_id: invitation._id },
        { is_hidden: c.req.valid('json').is_hidden },
        { returnDocument: 'after' },
      )
      if (!rsvp) throw notFound('RSVP not found')
      return c.json({ data: rsvp.toJSON() }, 200)
    })
}
