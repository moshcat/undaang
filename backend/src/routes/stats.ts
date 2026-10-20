import { createRoute, z } from '@hono/zod-openapi'
import { createRouter } from '../lib/router'
import { requireAuth } from '../middlewares/auth'
import { loadOwnInvitation } from '../middlewares/invitation'
import { dataOf, errors, json, objectId } from '../schemas/common'
import { invitationStats } from '../services/stats'

const bucket = z.object({ count: z.number(), pax: z.number() })

const statsSchema = z
  .object({
    view_count: z.number(),
    guests: z.object({
      total: z.number(),
      opened: z.number(),
      not_opened: z.number(),
      responded: z.number(),
      quota: z.number(),
      remaining_quota: z.number(),
    }),
    rsvps: z.object({
      total: z.number(),
      by_attendance: z.object({ hadir: bucket, tidak_hadir: bucket, ragu: bucket }),
    }),
    estimated_attendance: z.number().openapi({ description: 'Sum of pax from "hadir" answers' }),
  })
  .openapi('InvitationStats')

const stats = createRoute({
  method: 'get',
  path: '/{id}/stats',
  tags: ['Invitations'],
  summary: 'Dashboard statistics',
  security: [{ bearerAuth: [] }],
  middleware: [requireAuth, loadOwnInvitation],
  request: { params: z.object({ id: objectId }) },
  responses: {
    200: json(dataOf(statsSchema), 'Statistics'),
    401: errors[401],
    403: errors[403],
    404: errors[404],
  },
})

export function statsRoutes() {
  return createRouter().openapi(stats, async (c) =>
    c.json({ data: await invitationStats(c.get('invitation')) }, 200),
  )
}
