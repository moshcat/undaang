import { beforeEach, describe, expect, it } from 'bun:test'
import { createApp } from '../src/app'
import { OrderModel } from '../src/models'
import { client, createInvitation, createUser, resetDb } from './helpers'

const api = client(createApp())

beforeEach(resetDb)

async function order(
  userId: string,
  invitationId: string,
  plan: 'basic' | 'premium',
  status: 'paid' | 'pending',
  paidAt?: Date,
) {
  return OrderModel.create({
    invoice_number: `INV-${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
    user_id: userId,
    invitation_id: invitationId,
    plan,
    amount: plan === 'basic' ? 49_000 : 99_000,
    status,
    paid_at: status === 'paid' ? (paidAt ?? new Date()) : null,
  })
}

describe('GET /api/v1/admin/stats', () => {
  it('counts users, invitations and paid revenue', async () => {
    const admin = await createUser({ role: 'admin' })
    const a = await createUser()
    const b = await createUser()
    const free = await createInvitation(a.user.id, { status: 'published' })
    const basic = await createInvitation(a.user.id, { plan: 'basic' })
    const premium = await createInvitation(b.user.id, { plan: 'premium', status: 'suspended' })
    await order(a.user.id, basic.id, 'basic', 'paid')
    await order(b.user.id, premium.id, 'premium', 'paid', new Date(Date.now() - 40 * 86_400_000))
    await order(a.user.id, free.id, 'premium', 'pending')

    const res = await api.get('/api/v1/admin/stats', { token: admin.token })
    expect(res.status).toBe(200)
    expect(res.json.data).toEqual({
      users: 2,
      invitations: { total: 3, by_status: { draft: 1, published: 1, suspended: 1 }, paid: 2 },
      revenue: {
        total: 148_000,
        paid_orders: 2,
        by_plan: { basic: { orders: 1, amount: 49_000 }, premium: { orders: 1, amount: 99_000 } },
        last_30_days: 49_000,
      },
    })
  })

  it('forbids regular users and anonymous requests', async () => {
    const { token } = await createUser()
    expect((await api.get('/api/v1/admin/stats', { token })).status).toBe(403)
    expect((await api.get('/api/v1/admin/stats')).status).toBe(401)
  })
})

describe('admin lists', () => {
  it('lists every order with buyer and slug, filtered by status', async () => {
    const admin = await createUser({ role: 'admin' })
    const a = await createUser()
    const invitation = await createInvitation(a.user.id)
    await order(a.user.id, invitation.id, 'basic', 'paid')
    await order(a.user.id, invitation.id, 'premium', 'pending')
    const res = await api.get('/api/v1/admin/orders?status=paid', { token: admin.token })
    expect(res.json.meta.total).toBe(1)
    expect(res.json.data[0].user_id.email).toBe(a.user.email)
    expect(res.json.data[0].invitation_id.slug).toBe(invitation.slug)
    expect(res.json.data[0].notifications).toBeUndefined()
  })

  it('searches invitations by slug', async () => {
    const admin = await createUser({ role: 'admin' })
    const a = await createUser()
    const target = await createInvitation(a.user.id)
    await createInvitation(a.user.id)
    const res = await api.get(`/api/v1/admin/invitations?q=${target.slug.toUpperCase()}`, {
      token: admin.token,
    })
    expect(res.json.data.map((i: { id: string }) => i.id)).toEqual([target.id])
  })
})

describe('PATCH /api/v1/admin/invitations/:id/status', () => {
  it('suspends a published invitation, hides it publicly, then restores it as draft', async () => {
    const admin = await createUser({ role: 'admin' })
    const a = await createUser()
    const invitation = await createInvitation(a.user.id, { status: 'published' })
    const url = `/api/v1/admin/invitations/${invitation.id}/status`

    const suspended = await api.patch(url, { token: admin.token, body: { suspended: true } })
    expect(suspended.json.data.status).toBe('suspended')
    expect((await api.get(`/api/v1/public/invitations/${invitation.slug}`)).status).toBe(404)
    const republish = await api.patch(`/api/v1/invitations/${invitation.id}/publish`, {
      token: a.token,
      body: { published: true },
    })
    expect(republish.status).toBe(403)

    const restored = await api.patch(url, { token: admin.token, body: { suspended: false } })
    expect(restored.json.data.status).toBe('draft')
  })

  it('answers 404 for an unknown invitation and 403 for regular users', async () => {
    const admin = await createUser({ role: 'admin' })
    const missing = await api.patch('/api/v1/admin/invitations/6500a1b2c3d4e5f678905678/status', {
      token: admin.token,
      body: { suspended: true },
    })
    expect(missing.status).toBe(404)
    const a = await createUser()
    const invitation = await createInvitation(a.user.id)
    const denied = await api.patch(`/api/v1/admin/invitations/${invitation.id}/status`, {
      token: a.token,
      body: { suspended: true },
    })
    expect(denied.status).toBe(403)
  })
})
