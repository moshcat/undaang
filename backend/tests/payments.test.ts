import { beforeEach, describe, expect, it } from 'bun:test'
import { createHash, createHmac } from 'node:crypto'
import { createApp } from '../src/app'
import { InvitationModel, OrderModel } from '../src/models'
import { client, createInvitation, createUser, resetDb } from './helpers'

const api = client(createApp())
const PATH = '/api/v1/payments/doku/notify'
const DAY = 24 * 60 * 60 * 1000

function signedHeaders(body: string, overrides: { secret?: string; clientId?: string } = {}) {
  const clientId = overrides.clientId ?? 'BRN-TEST-0001'
  const requestId = crypto.randomUUID()
  const timestamp = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')
  const component = [
    `Client-Id:${clientId}`,
    `Request-Id:${requestId}`,
    `Request-Timestamp:${timestamp}`,
    `Request-Target:${PATH}`,
    `Digest:${createHash('sha256').update(body).digest('base64')}`,
  ].join('\n')
  const hmac = createHmac('sha256', overrides.secret ?? 'SK-test-secret')
    .update(component)
    .digest('base64')
  return {
    'Content-Type': 'application/json',
    'Client-Id': clientId,
    'Request-Id': requestId,
    'Request-Timestamp': timestamp,
    Signature: `HMACSHA256=${hmac}`,
  }
}

function notification(invoice: string, amount: number, status = 'SUCCESS') {
  return JSON.stringify({
    service: { id: 'VIRTUAL_ACCOUNT' },
    acquirer: { id: 'BCA' },
    channel: { id: 'VIRTUAL_ACCOUNT_BCA' },
    transaction: { status, date: '2026-10-21T03:24:23Z' },
    order: { invoice_number: invoice, amount },
  })
}

const send = (body: string, headers = signedHeaders(body)) => api.post(PATH, { body, headers })

async function pendingOrder(plan: 'basic' | 'premium' = 'premium') {
  const { user } = await createUser()
  const expiresAt = new Date(Date.now() + 10 * DAY)
  const invitation = await createInvitation(user.id, { expiresAt })
  const order = await OrderModel.create({
    invoice_number: `INV-20261021-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    user_id: user._id,
    invitation_id: invitation._id,
    plan,
    amount: plan === 'premium' ? 99_000 : 49_000,
  })
  return { invitation, order, expiresAt }
}

beforeEach(resetDb)

describe('POST /api/v1/payments/doku/notify', () => {
  it('activates the plan and extends the period from the current expiry', async () => {
    const { invitation, order, expiresAt } = await pendingOrder('premium')
    const res = await send(notification(order.invoice_number, 99_000))
    expect(res.status).toBe(200)
    expect(res.json.data.result).toBe('activated')

    const paid = (await OrderModel.findById(order._id))!
    expect(paid.status).toBe('paid')
    expect(paid.payment_method).toBe('VIRTUAL_ACCOUNT_BCA')
    expect(paid.paid_at!.toISOString()).toBe('2026-10-21T03:24:23.000Z')
    expect(paid.notifications).toHaveLength(1)

    const upgraded = (await InvitationModel.findById(invitation._id))!
    expect(upgraded.plan).toBe('premium')
    expect(upgraded.plan_expires_at.getTime()).toBe(expiresAt.getTime() + 365 * DAY)
  })

  it('accepts a decimal amount like 99000.00', async () => {
    const { order } = await pendingOrder('premium')
    const body = notification(order.invoice_number, 99_000).replace(
      '"amount":99000',
      '"amount":99000.00',
    )
    expect((await send(body)).json.data.result).toBe('activated')
  })

  it('activates only once for repeated and concurrent notifications', async () => {
    const { invitation, order, expiresAt } = await pendingOrder('basic')
    const body = notification(order.invoice_number, 49_000)
    const results = await Promise.all([send(body), send(body), send(body)])
    expect(results.map((r) => r.status)).toEqual([200, 200, 200])
    expect(results.filter((r) => r.json.data.result === 'activated')).toHaveLength(1)
    expect((await send(body)).json.data.result).toBe('already_paid')

    const after = (await InvitationModel.findById(invitation._id))!
    expect(after.plan).toBe('basic')
    expect(after.plan_expires_at.getTime()).toBe(expiresAt.getTime() + 180 * DAY)
    expect((await OrderModel.findById(order._id))!.notifications).toHaveLength(4)
  })

  it('answers 401 for a forged signature and leaves the plan alone', async () => {
    const { invitation, order } = await pendingOrder()
    const body = notification(order.invoice_number, 99_000)
    const forged = await send(body, signedHeaders(body, { secret: 'not-the-secret' }))
    const otherClient = await send(body, signedHeaders(body, { clientId: 'BRN-OTHER' }))
    const tampered = await send(body.replace('"amount":99000', '"amount":1'), signedHeaders(body))
    const unsigned = await api.post(PATH, { body, headers: { 'Content-Type': 'application/json' } })
    for (const res of [forged, otherClient, tampered, unsigned]) expect(res.status).toBe(401)
    expect((await InvitationModel.findById(invitation._id))!.plan).toBe('free')
    expect((await OrderModel.findById(order._id))!.status).toBe('pending')
  })

  it('answers 400 when the amount does not match and does not activate', async () => {
    const { invitation, order } = await pendingOrder('premium')
    const res = await send(notification(order.invoice_number, 49_000))
    expect(res.status).toBe(400)
    const after = (await OrderModel.findById(order._id))!
    expect(after.status).toBe('pending')
    expect(after.notifications[0]!.status).toBe('SUCCESS_AMOUNT_MISMATCH')
    expect((await InvitationModel.findById(invitation._id))!.plan).toBe('free')
  })

  it('keeps the order pending on FAILED and marks it expired on EXPIRED', async () => {
    const { order } = await pendingOrder()
    const failed = await send(notification(order.invoice_number, 99_000, 'FAILED'))
    expect(failed.json.data.result).toBe('ignored')
    expect((await OrderModel.findById(order._id))!.status).toBe('pending')
    const expired = await send(notification(order.invoice_number, 99_000, 'EXPIRED'))
    expect(expired.json.data.result).toBe('expired')
    expect((await OrderModel.findById(order._id))!.status).toBe('expired')
  })

  it('answers 404 for an unknown invoice', async () => {
    const res = await send(notification('INV-00000000-XXXXXX', 49_000))
    expect(res.status).toBe(404)
  })
})
