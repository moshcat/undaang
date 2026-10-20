import { afterEach, beforeEach, describe, expect, it, spyOn } from 'bun:test'
import { createHmac } from 'node:crypto'
import { createApp } from '../src/app'
import { InvitationModel, OrderModel } from '../src/models'
import { client, createInvitation, createUser, resetDb } from './helpers'

const api = client(createApp())
const DAY = 24 * 60 * 60 * 1000

type Call = { url: string; method: string; headers: Headers }
let calls: Call[] = []
let fetchSpy: ReturnType<typeof spyOn> | undefined

function mockStatus(response: () => Response) {
  fetchSpy = spyOn(globalThis, 'fetch').mockImplementation((async (
    input: string | URL | Request,
    init?: RequestInit,
  ) => {
    calls.push({
      url: String(input),
      method: init?.method ?? 'GET',
      headers: new Headers(init?.headers),
    })
    return response()
  }) as typeof fetch)
}

function dokuStatus(
  invoice: string,
  amount: number,
  status: string,
  orderStatus = 'ORDER_GENERATED',
) {
  return () =>
    Response.json({
      order: { invoice_number: invoice, amount, status: orderStatus },
      transaction: { status, type: 'PAYMENT', date: '2026-10-20T18:27:12Z' },
      channel: { id: status === 'SUCCESS' ? 'VIRTUAL_ACCOUNT_BCA' : '' },
      service: { id: status === 'SUCCESS' ? 'VIRTUAL_ACCOUNT' : '' },
    })
}

async function pendingOrder() {
  const { user, token } = await createUser()
  const expiresAt = new Date(Date.now() + 10 * DAY)
  const invitation = await createInvitation(user.id, { expiresAt })
  const order = await OrderModel.create({
    invoice_number: `INV-20261020-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    user_id: user._id,
    invitation_id: invitation._id,
    plan: 'basic',
    amount: 49_000,
  })
  return { token, invitation, order, expiresAt }
}

beforeEach(async () => {
  calls = []
  await resetDb()
})
afterEach(() => {
  fetchSpy?.mockRestore()
  fetchSpy = undefined
})

describe('GET /api/v1/orders/:invoice syncs a pending order with DOKU', () => {
  it('activates the plan when DOKU reports SUCCESS', async () => {
    const { token, invitation, order, expiresAt } = await pendingOrder()
    mockStatus(dokuStatus(order.invoice_number, 49_000, 'SUCCESS'))

    const res = await api.get(`/api/v1/orders/${order.invoice_number}`, { token })
    expect(res.status).toBe(200)
    expect(res.json.data).toMatchObject({ status: 'paid', payment_method: 'VIRTUAL_ACCOUNT_BCA' })

    const upgraded = (await InvitationModel.findById(invitation._id))!
    expect(upgraded.plan).toBe('basic')
    expect(upgraded.plan_expires_at.getTime()).toBe(expiresAt.getTime() + 180 * DAY)
    const stored = (await OrderModel.findById(order._id))!
    expect(stored.notifications.map((n) => n.source)).toEqual(['status_check'])
  })

  it('signs the GET request without a Digest line', async () => {
    const { token, order } = await pendingOrder()
    mockStatus(dokuStatus(order.invoice_number, 49_000, 'PENDING'))
    await api.get(`/api/v1/orders/${order.invoice_number}`, { token })

    const call = calls[0]!
    const target = `/orders/v1/status/${order.invoice_number}`
    expect(call.method).toBe('GET')
    expect(call.url).toBe(`https://api-sandbox.doku.test${target}`)
    const component = [
      `Client-Id:${call.headers.get('client-id')}`,
      `Request-Id:${call.headers.get('request-id')}`,
      `Request-Timestamp:${call.headers.get('request-timestamp')}`,
      `Request-Target:${target}`,
    ].join('\n')
    const expected = createHmac('sha256', 'SK-test-secret').update(component).digest('base64')
    expect(call.headers.get('signature')).toBe(`HMACSHA256=${expected}`)
  })

  it('stays pending without logging while DOKU reports PENDING', async () => {
    const { token, order } = await pendingOrder()
    mockStatus(dokuStatus(order.invoice_number, 49_000, 'PENDING'))
    const res = await api.get(`/api/v1/orders/${order.invoice_number}`, { token })
    expect(res.json.data.status).toBe('pending')
    expect((await OrderModel.findById(order._id))!.notifications).toHaveLength(0)
  })

  it('asks DOKU at most once per window, even for parallel polls', async () => {
    const { token, order } = await pendingOrder()
    mockStatus(dokuStatus(order.invoice_number, 49_000, 'PENDING'))
    const url = `/api/v1/orders/${order.invoice_number}`
    await Promise.all([api.get(url, { token }), api.get(url, { token }), api.get(url, { token })])
    await api.get(url, { token })
    expect(calls).toHaveLength(1)
  })

  it('marks the order expired when DOKU reports ORDER_EXPIRED', async () => {
    const { token, order } = await pendingOrder()
    mockStatus(dokuStatus(order.invoice_number, 49_000, 'PENDING', 'ORDER_EXPIRED'))
    const res = await api.get(`/api/v1/orders/${order.invoice_number}`, { token })
    expect(res.json.data.status).toBe('expired')
  })

  it('does not activate on an amount mismatch and still answers 200', async () => {
    const { token, invitation, order } = await pendingOrder()
    mockStatus(dokuStatus(order.invoice_number, 1_000, 'SUCCESS'))
    const res = await api.get(`/api/v1/orders/${order.invoice_number}`, { token })
    expect(res.status).toBe(200)
    expect(res.json.data.status).toBe('pending')
    expect((await InvitationModel.findById(invitation._id))!.plan).toBe('free')
  })

  it('returns the stored order when DOKU fails', async () => {
    const { token, order } = await pendingOrder()
    mockStatus(() => new Response('oops', { status: 500 }))
    const res = await api.get(`/api/v1/orders/${order.invoice_number}`, { token })
    expect(res.status).toBe(200)
    expect(res.json.data.status).toBe('pending')
  })

  it('does not call DOKU for an order that is already paid', async () => {
    const { token, order } = await pendingOrder()
    await OrderModel.updateOne({ _id: order._id }, { status: 'paid' })
    mockStatus(dokuStatus(order.invoice_number, 49_000, 'SUCCESS'))
    await api.get(`/api/v1/orders/${order.invoice_number}`, { token })
    expect(calls).toHaveLength(0)
  })
})
