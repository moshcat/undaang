import { createRoute, z } from '@hono/zod-openapi'
import { notFound } from '../lib/errors'
import { createRouter } from '../lib/router'
import { requireAuth } from '../middlewares/auth'
import { OrderModel } from '../models'
import {
  dataOf,
  errors,
  json,
  objectId,
  pageMeta,
  pageOf,
  paginationQuery,
} from '../schemas/common'
import { findOwnedInvitation } from '../services/invitation'
import { placeOrder } from '../services/order'

const security = [{ bearerAuth: [] }]

const orderSchema = z
  .object({
    id: z.string(),
    invoice_number: z.string(),
    user_id: z.string(),
    invitation_id: z.string(),
    plan: z.enum(['basic', 'premium']),
    amount: z.number(),
    status: z.enum(['pending', 'paid', 'expired', 'failed']),
    payment_url: z.string().nullable(),
    payment_method: z.string().nullable(),
    paid_at: z.iso.datetime().nullable(),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  })
  .openapi('Order')

const create = createRoute({
  method: 'post',
  path: '/',
  tags: ['Orders'],
  summary: 'Order a plan and get the DOKU payment page',
  description: 'The amount comes from the plan table on the server.',
  security,
  middleware: [requireAuth],
  request: {
    body: json(
      z
        .object({ invitation_id: objectId, plan: z.enum(['basic', 'premium']) })
        .openapi('OrderBody'),
      'Invitation and plan',
    ),
  },
  responses: {
    201: json(dataOf(orderSchema), 'Order created, redirect the user to payment_url'),
    400: errors[400],
    401: errors[401],
    403: errors[403],
    404: errors[404],
    502: errors[502],
    503: errors[503],
  },
})

const list = createRoute({
  method: 'get',
  path: '/',
  tags: ['Orders'],
  summary: 'My transaction history',
  security,
  middleware: [requireAuth],
  request: { query: paginationQuery },
  responses: { 200: json(pageOf(orderSchema), 'Orders'), 401: errors[401] },
})

const detail = createRoute({
  method: 'get',
  path: '/{invoice}',
  tags: ['Orders'],
  summary: 'Order status, used by the page after payment',
  security,
  middleware: [requireAuth],
  request: { params: z.object({ invoice: z.string().max(64) }) },
  responses: {
    200: json(dataOf(orderSchema), 'Order'),
    401: errors[401],
    404: errors[404],
  },
})

function serializeOrder(order: InstanceType<typeof OrderModel>) {
  // Raw gateway payloads stay server side.
  const json = order.toJSON() as Record<string, unknown>
  delete json.notifications
  return json
}

export function orderRoutes() {
  return createRouter()
    .openapi(create, async (c) => {
      const body = c.req.valid('json')
      const user = c.get('user')
      const invitation = await findOwnedInvitation(user, body.invitation_id)
      const order = await placeOrder(invitation.owner_id.toString(), invitation, body.plan)
      return c.json({ data: serializeOrder(order) }, 201)
    })
    .openapi(list, async (c) => {
      const { page, limit } = c.req.valid('query')
      const filter = { user_id: c.get('user').id }
      const [items, total] = await Promise.all([
        OrderModel.find(filter)
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit),
        OrderModel.countDocuments(filter),
      ])
      return c.json({ data: items.map(serializeOrder), meta: pageMeta(page, limit, total) }, 200)
    })
    .openapi(detail, async (c) => {
      const user = c.get('user')
      const order = await OrderModel.findOne({
        invoice_number: c.req.valid('param').invoice,
        ...(user.role !== 'admin' && { user_id: user.id }),
      })
      if (!order) throw notFound('Order not found')
      return c.json({ data: serializeOrder(order) }, 200)
    })
}
