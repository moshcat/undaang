import { afterEach, beforeEach, describe, expect, it, spyOn } from 'bun:test'
import { createHash, createHmac } from 'node:crypto'
import { createApp } from '../src/app'
import { resetEnv } from '../src/config/env'
import { OrderModel } from '../src/models'
import { client, createInvitation, createUser, resetDb } from './helpers'

const api = client(createApp())

type Captured = { url: string; headers: Headers; body: string }
let captured: Captured[] = []
let fetchSpy: ReturnType<typeof spyOn>

function mockDoku(response: () => Response) {
  fetchSpy = spyOn(globalThis, 'fetch').mockImplementation((async (
    input: string | URL | Request,
    init?: RequestInit,
  ) => {
    captured.push({
      url: String(input),
      headers: new Headers(init?.headers),
      body: String(init?.body),
    })
    return response()
  }) as typeof fetch)
}

const okCheckout = () =>
  Response.json({
    message: ['SUCCESS'],
    response: { payment: { url: 'https://sandbox.doku.test/checkout/link/abc123' } },
  })

beforeEach(async () => {
  captured = []
  await resetDb()
})
afterEach(() => fetchSpy?.mockRestore())

describe('POST /api/v1/orders', () => {
  it('prices the order on the server and returns the DOKU payment URL', async () => {
    mockDoku(okCheckout)
    const { user, token } = await createUser()
    const invitation = await createInvitation(user.id)
    const res = await api.post('/api/v1/orders', {
      token,
      body: { invitation_id: invitation.id, plan: 'premium', amount: 1 },
    })
    expect(res.status).toBe(201)
    expect(res.json.data).toMatchObject({
      plan: 'premium',
      amount: 99_000,
      status: 'pending',
      payment_url: 'https://sandbox.doku.test/checkout/link/abc123',
    })
    expect(res.json.data.invoice_number).toMatch(/^INV-\d{8}-[A-Z2-9]{6}$/)
    expect(res.json.data.notifications).toBeUndefined()

    const call = captured[0]!
    expect(call.url).toBe('https://api-sandbox.doku.test/checkout/v1/payment')
    const sent = JSON.parse(call.body)
    expect(sent.order).toMatchObject({
      amount: 99_000,
      invoice_number: res.json.data.invoice_number,
    })
    expect(sent.order.callback_url).toBe(
      `http://localhost:5173/orders/${res.json.data.invoice_number}`,
    )

    // Recompute the signature independently from the DOKU docs.
    const component = [
      `Client-Id:${call.headers.get('client-id')}`,
      `Request-Id:${call.headers.get('request-id')}`,
      `Request-Timestamp:${call.headers.get('request-timestamp')}`,
      'Request-Target:/checkout/v1/payment',
      `Digest:${createHash('sha256').update(call.body).digest('base64')}`,
    ].join('\n')
    const expected = createHmac('sha256', 'SK-test-secret').update(component).digest('base64')
    expect(call.headers.get('signature')).toBe(`HMACSHA256=${expected}`)
    expect(call.headers.get('client-id')).toBe('BRN-TEST-0001')
    expect(call.headers.get('request-timestamp')).toMatch(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/)
  })

  it('answers 502 and marks the order failed when DOKU rejects it', async () => {
    mockDoku(() =>
      Response.json({ error_messages: ['order.amount must greater than 0'] }, { status: 400 }),
    )
    const { user, token } = await createUser()
    const invitation = await createInvitation(user.id)
    const res = await api.post('/api/v1/orders', {
      token,
      body: { invitation_id: invitation.id, plan: 'basic' },
    })
    expect(res.status).toBe(502)
    expect((await OrderModel.findOne())!.status).toBe('failed')
  })

  it('refuses a lower plan than the active one', async () => {
    mockDoku(okCheckout)
    const { user, token } = await createUser()
    const invitation = await createInvitation(user.id, { plan: 'premium' })
    const res = await api.post('/api/v1/orders', {
      token,
      body: { invitation_id: invitation.id, plan: 'basic' },
    })
    expect(res.status).toBe(400)
    expect(captured).toHaveLength(0)
  })

  it("answers 403 for someone else's invitation", async () => {
    mockDoku(okCheckout)
    const owner = await createUser()
    const stranger = await createUser()
    const invitation = await createInvitation(owner.user.id)
    const res = await api.post('/api/v1/orders', {
      token: stranger.token,
      body: { invitation_id: invitation.id, plan: 'basic' },
    })
    expect(res.status).toBe(403)
  })

  describe('without DOKU credentials', () => {
    let saved: string | undefined
    beforeEach(() => {
      saved = process.env.DOKU_SECRET_KEY
      process.env.DOKU_SECRET_KEY = ''
      resetEnv()
    })
    afterEach(() => {
      process.env.DOKU_SECRET_KEY = saved
      resetEnv()
    })

    it('answers 503 without creating an order', async () => {
      const { user, token } = await createUser()
      const invitation = await createInvitation(user.id)
      const res = await api.post('/api/v1/orders', {
        token,
        body: { invitation_id: invitation.id, plan: 'basic' },
      })
      expect(res.status).toBe(503)
      expect(await OrderModel.countDocuments()).toBe(0)
    })
  })
})

describe('GET /api/v1/orders', () => {
  it('lists my orders and shows one by invoice, hidden from other users', async () => {
    mockDoku(okCheckout)
    const { user, token } = await createUser()
    const invitation = await createInvitation(user.id)
    const created = await api.post('/api/v1/orders', {
      token,
      body: { invitation_id: invitation.id, plan: 'basic' },
    })
    const invoice = created.json.data.invoice_number

    const list = await api.get('/api/v1/orders', { token })
    expect(list.json.meta.total).toBe(1)
    const one = await api.get(`/api/v1/orders/${invoice}`, { token })
    expect(one.json.data.status).toBe('pending')

    const stranger = await createUser()
    expect((await api.get(`/api/v1/orders/${invoice}`, { token: stranger.token })).status).toBe(404)
    expect((await api.get('/api/v1/orders', { token: stranger.token })).json.meta.total).toBe(0)
  })
})
