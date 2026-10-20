import { createRoute, z } from '@hono/zod-openapi'
import { notFound } from '../lib/errors'
import { createRouter } from '../lib/router'
import { requireAuth, requireRole } from '../middlewares/auth'
import { InvitationModel, OrderModel, UserModel } from '../models'
import {
  dataOf,
  errors,
  json,
  objectId,
  pageMeta,
  pageOf,
  paginationQuery,
} from '../schemas/common'
import { invitationSchema } from '../schemas/invitation'
import { serializeInvitation } from '../services/invitation'

const security = [{ bearerAuth: [] }]
const admin = [requireAuth, requireRole('admin')]
const guarded = { 401: errors[401], 403: errors[403] }

const stats = createRoute({
  method: 'get',
  path: '/stats',
  tags: ['Admin'],
  summary: 'System statistics and revenue',
  security,
  middleware: admin,
  responses: {
    200: json(
      dataOf(
        z.object({
          users: z.number(),
          invitations: z.object({
            total: z.number(),
            by_status: z.record(z.string(), z.number()),
            paid: z.number(),
          }),
          revenue: z.object({
            total: z.number(),
            paid_orders: z.number(),
            by_plan: z.record(z.string(), z.object({ orders: z.number(), amount: z.number() })),
            last_30_days: z.number(),
          }),
        }),
      ),
      'Statistics',
    ),
    ...guarded,
  },
})

const listOrders = createRoute({
  method: 'get',
  path: '/orders',
  tags: ['Admin'],
  summary: 'All transactions',
  security,
  middleware: admin,
  request: {
    query: paginationQuery.extend({
      status: z.enum(['pending', 'paid', 'expired', 'failed']).optional(),
    }),
  },
  responses: {
    200: json(pageOf(z.record(z.string(), z.unknown())), 'Orders'),
    ...guarded,
  },
})

const listInvitations = createRoute({
  method: 'get',
  path: '/invitations',
  tags: ['Admin'],
  summary: 'All invitations, searchable by slug',
  security,
  middleware: admin,
  request: {
    query: paginationQuery.extend({
      q: z.string().trim().max(60).optional(),
      status: z.enum(['draft', 'published', 'suspended']).optional(),
    }),
  },
  responses: { 200: json(pageOf(invitationSchema), 'Invitations'), ...guarded },
})

const setStatus = createRoute({
  method: 'patch',
  path: '/invitations/{id}/status',
  tags: ['Admin'],
  summary: 'Suspend or restore an invitation',
  description: 'A restored invitation goes back to draft; the owner publishes it again.',
  security,
  middleware: admin,
  request: {
    params: z.object({ id: objectId }),
    body: json(z.object({ suspended: z.boolean() }).openapi('SuspendBody'), 'Target state'),
  },
  responses: {
    200: json(dataOf(invitationSchema), 'Status changed'),
    ...guarded,
    404: errors[404],
  },
})

function escapeRegex(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function adminRoutes() {
  return createRouter()
    .openapi(stats, async (c) => {
      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      const [users, byStatus, paidInvitations, byPlan, recent] = await Promise.all([
        UserModel.countDocuments({ role: 'user' }),
        InvitationModel.aggregate<{ _id: string; n: number }>([
          { $group: { _id: '$status', n: { $sum: 1 } } },
        ]),
        InvitationModel.countDocuments({ plan: { $in: ['basic', 'premium'] } }),
        OrderModel.aggregate<{ _id: string; orders: number; amount: number }>([
          { $match: { status: 'paid' } },
          { $group: { _id: '$plan', orders: { $sum: 1 }, amount: { $sum: '$amount' } } },
        ]),
        OrderModel.aggregate<{ amount: number }>([
          { $match: { status: 'paid', paid_at: { $gte: since } } },
          { $group: { _id: null, amount: { $sum: '$amount' } } },
        ]),
      ])
      const statusCounts = Object.fromEntries(
        ['draft', 'published', 'suspended'].map((s) => [
          s,
          byStatus.find((r) => r._id === s)?.n ?? 0,
        ]),
      )
      const planRevenue = Object.fromEntries(
        ['basic', 'premium'].map((p) => {
          const row = byPlan.find((r) => r._id === p)
          return [p, { orders: row?.orders ?? 0, amount: row?.amount ?? 0 }]
        }),
      )
      return c.json(
        {
          data: {
            users,
            invitations: {
              total: Object.values(statusCounts).reduce((a, b) => a + b, 0),
              by_status: statusCounts,
              paid: paidInvitations,
            },
            revenue: {
              total: byPlan.reduce((sum, r) => sum + r.amount, 0),
              paid_orders: byPlan.reduce((sum, r) => sum + r.orders, 0),
              by_plan: planRevenue,
              last_30_days: recent[0]?.amount ?? 0,
            },
          },
        },
        200,
      )
    })
    .openapi(listOrders, async (c) => {
      const { page, limit, status } = c.req.valid('query')
      const filter = status ? { status } : {}
      const [items, total] = await Promise.all([
        OrderModel.find(filter, { notifications: 0 })
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .populate('user_id', 'name email')
          .populate('invitation_id', 'slug'),
        OrderModel.countDocuments(filter),
      ])
      return c.json(
        {
          data: items.map((o) => o.toJSON() as Record<string, unknown>),
          meta: pageMeta(page, limit, total),
        },
        200,
      )
    })
    .openapi(listInvitations, async (c) => {
      const { page, limit, q, status } = c.req.valid('query')
      const filter = {
        ...(q && { slug: { $regex: escapeRegex(q.toLowerCase()) } }),
        ...(status && { status }),
      }
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
    .openapi(setStatus, async (c) => {
      const { id } = c.req.valid('param')
      const { suspended } = c.req.valid('json')
      const invitation = await InvitationModel.findById(id)
      if (!invitation) throw notFound('Invitation not found')
      if (suspended) invitation.status = 'suspended'
      else if (invitation.status === 'suspended') invitation.status = 'draft'
      await invitation.save()
      return c.json({ data: serializeInvitation(invitation) }, 200)
    })
}
