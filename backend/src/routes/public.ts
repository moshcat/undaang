import { createRoute, z } from '@hono/zod-openapi'
import { createRouter } from '../lib/router'
import { limitByIp } from '../middlewares/rateLimit'
import { dataOf, errors, json, plainText } from '../schemas/common'
import { openInvitation, submitRsvp } from '../services/public'

const slugParam = z.object({ slug: z.string().min(1).max(60) })
const guestCodeQuery = z
  .string()
  .trim()
  .regex(/^[A-Za-z0-9]{8}$/, 'Must be the 8 character code from the personal link')

const rsvpBody = z
  .object({
    name: plainText(100).optional(),
    attendance: z.enum(['hadir', 'tidak_hadir', 'ragu']),
    pax: z.number().int().min(0).max(20).default(1),
    message: plainText(500).default(''),
    to: guestCodeQuery.optional(),
  })
  .openapi('PublicRsvpBody')

const rsvpSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    attendance: z.enum(['hadir', 'tidak_hadir', 'ragu']),
    pax: z.number(),
    message: z.string(),
    createdAt: z.iso.datetime(),
  })
  .openapi('PublicRsvp')

const show = createRoute({
  method: 'get',
  path: '/invitations/{slug}',
  tags: ['Public'],
  summary: 'Public invitation content',
  description:
    'Pass the guest code as ?to= to greet the guest by name. The first visit with a code records opened_at.',
  request: { params: slugParam, query: z.object({ to: guestCodeQuery.optional() }) },
  responses: {
    200: json(dataOf(z.record(z.string(), z.unknown())), 'Invitation page data'),
    400: errors[400],
    404: { description: 'Not found or not published' },
    410: errors[410],
  },
})

const rsvp = createRoute({
  method: 'post',
  path: '/invitations/{slug}/rsvps',
  tags: ['Public'],
  summary: 'Send an RSVP and wish',
  description:
    'With a personal link code, the guest name and pax quota come from the guest list and a second submission updates the first (200).',
  middleware: [limitByIp({ windowMs: 10 * 60 * 1000, limit: 20 })],
  request: { params: slugParam, body: json(rsvpBody, 'RSVP') },
  responses: {
    201: json(dataOf(rsvpSchema), 'RSVP recorded'),
    200: json(dataOf(rsvpSchema), 'RSVP updated'),
    400: errors[400],
    404: errors[404],
    410: errors[410],
    429: errors[429],
  },
})

export function publicRoutes() {
  return createRouter()
    .openapi(show, async (c) => {
      const { slug } = c.req.valid('param')
      const { to } = c.req.valid('query')
      return c.json({ data: await openInvitation(slug, to) }, 200)
    })
    .openapi(rsvp, async (c) => {
      const { slug } = c.req.valid('param')
      const { rsvp, created } = await submitRsvp(slug, c.req.valid('json'))
      const data = {
        id: rsvp.id as string,
        name: rsvp.name,
        attendance: rsvp.attendance,
        pax: rsvp.pax,
        message: rsvp.message,
        createdAt: rsvp.createdAt.toISOString(),
      }
      return c.json({ data }, created ? 201 : 200)
    })
}
