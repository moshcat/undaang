import { createRoute, z } from '@hono/zod-openapi'
import { bodyLimit } from 'hono/body-limit'
import { createRouter } from '../lib/router'
import { dataOf, errors, json } from '../schemas/common'
import { handleDokuNotification } from '../services/payment'

const notify = createRoute({
  method: 'post',
  path: '/doku/notify',
  tags: ['Payments'],
  summary: 'DOKU HTTP notification',
  description:
    'Called by DOKU, not by the frontend. The Signature header is verified against the raw body before anything is read. Register this path as the notification URL in the DOKU dashboard.',
  middleware: [bodyLimit({ maxSize: 64 * 1024 })],
  responses: {
    200: json(
      dataOf(z.object({ result: z.enum(['activated', 'already_paid', 'expired', 'ignored']) })),
      'Notification processed',
    ),
    400: { description: 'Malformed body or amount mismatch' },
    401: { description: 'Signature is not valid' },
    404: errors[404],
  },
})

export function paymentRoutes() {
  return createRouter().openapi(notify, async (c) => {
    // The digest is computed over the exact bytes DOKU sent, so the body is read as text.
    const raw = await c.req.text()
    const result = await handleDokuNotification(c.req.raw.headers, raw, c.req.path)
    return c.json({ data: { result } }, 200)
  })
}
