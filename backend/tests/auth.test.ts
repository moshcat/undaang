import { beforeEach, describe, expect, it } from 'bun:test'
import { sign } from 'hono/jwt'
import { createApp } from '../src/app'
import { client, createUser, resetDb } from './helpers'

const api = client(createApp())
const secret = process.env.JWT_SECRET as string

beforeEach(resetDb)

describe('POST /api/v1/auth/register', () => {
  it('creates an account and returns a bearer token', async () => {
    const res = await api.post('/api/v1/auth/register', {
      body: { name: 'Raka', email: 'Raka@Mail.test', password: 'rahasia123' },
    })
    expect(res.status).toBe(201)
    expect(res.json.data.user).toMatchObject({
      name: 'Raka',
      email: 'raka@mail.test',
      role: 'user',
    })
    expect(res.json.data.user.password).toBeUndefined()
    expect(res.json.data.token_type).toBe('Bearer')
    expect(res.json.data.expires_in).toBe(86400)
  })

  it('rejects a duplicate email with 409', async () => {
    const body = { name: 'Raka', email: 'raka@mail.test', password: 'rahasia123' }
    await api.post('/api/v1/auth/register', { body })
    const res = await api.post('/api/v1/auth/register', { body })
    expect(res.status).toBe(409)
  })

  it('rejects invalid input with 400 and field details', async () => {
    const res = await api.post('/api/v1/auth/register', {
      body: { name: '', email: 'bukan-email', password: 'short' },
    })
    expect(res.status).toBe(400)
    expect(res.json.error.code).toBe('VALIDATION_ERROR')
    const paths = res.json.error.details.map((d: { path: string }) => d.path)
    expect(paths).toEqual(expect.arrayContaining(['name', 'email', 'password']))
  })

  it('rejects NoSQL operators in place of strings', async () => {
    const res = await api.post('/api/v1/auth/login', {
      body: { email: { $ne: null }, password: { $gt: '' } },
    })
    expect(res.status).toBe(400)
  })
})

describe('POST /api/v1/auth/login', () => {
  beforeEach(async () => {
    await api.post('/api/v1/auth/register', {
      body: { name: 'Sinta', email: 'sinta@mail.test', password: 'rahasia123' },
    })
  })

  it('logs in with the right password', async () => {
    const res = await api.post('/api/v1/auth/login', {
      body: { email: 'SINTA@mail.test', password: 'rahasia123' },
      headers: { 'x-forwarded-for': '10.0.0.1' },
    })
    expect(res.status).toBe(200)
    expect(typeof res.json.data.token).toBe('string')
  })

  it('answers 401 for a wrong password or unknown email', async () => {
    const wrong = await api.post('/api/v1/auth/login', {
      body: { email: 'sinta@mail.test', password: 'salah12345' },
      headers: { 'x-forwarded-for': '10.0.0.2' },
    })
    const unknown = await api.post('/api/v1/auth/login', {
      body: { email: 'siapa@mail.test', password: 'rahasia123' },
      headers: { 'x-forwarded-for': '10.0.0.2' },
    })
    expect(wrong.status).toBe(401)
    expect(unknown.status).toBe(401)
    expect(wrong.json.error.message).toBe(unknown.json.error.message)
  })

  it('limits login attempts per IP with 429', async () => {
    const attempt = () =>
      api.post('/api/v1/auth/login', {
        body: { email: 'sinta@mail.test', password: 'salah12345' },
        headers: { 'x-forwarded-for': '10.0.0.3' },
      })
    for (let i = 0; i < 10; i++) expect((await attempt()).status).toBe(401)
    const blocked = await attempt()
    expect(blocked.status).toBe(429)
    expect(blocked.json.error.code).toBe('TOO_MANY_REQUESTS')
  })
})

describe('GET /api/v1/auth/me', () => {
  it('returns the profile for a valid token', async () => {
    const { user, token } = await createUser()
    const res = await api.get('/api/v1/auth/me', { token })
    expect(res.status).toBe(200)
    expect(res.json.data.email).toBe(user.email)
  })

  it('answers 401 without an Authorization header', async () => {
    expect((await api.get('/api/v1/auth/me')).status).toBe(401)
  })

  it('answers 401 for an expired token', async () => {
    const { user } = await createUser()
    const past = Math.floor(Date.now() / 1000) - 10
    const token = await sign({ sub: user.id, role: 'user', exp: past }, secret, 'HS256')
    expect((await api.get('/api/v1/auth/me', { token })).status).toBe(401)
  })

  it('answers 401 for a tampered token', async () => {
    const { token } = await createUser()
    const [header, , signature] = token.split('.')
    const forged = Buffer.from(JSON.stringify({ sub: 'x', role: 'admin' })).toString('base64url')
    const res = await api.get('/api/v1/auth/me', { token: `${header}.${forged}.${signature}` })
    expect(res.status).toBe(401)
  })

  it('answers 401 for a token signed with another secret', async () => {
    const { user } = await createUser()
    const token = await sign(
      { sub: user.id, role: 'user', exp: Math.floor(Date.now() / 1000) + 60 },
      'another-secret-that-is-long-enough-to-pass',
      'HS256',
    )
    expect((await api.get('/api/v1/auth/me', { token })).status).toBe(401)
  })
})

describe('rate limit key', () => {
  it('ignores forged X-Forwarded-For entries in front of the proxy one', async () => {
    const attempt = (forged: string) =>
      api.post('/api/v1/auth/login', {
        body: { email: 'siapa@mail.test', password: 'salah12345' },
        headers: { 'x-forwarded-for': `${forged}, 198.51.100.7` },
      })
    for (let i = 0; i < 10; i++) expect((await attempt(`10.9.9.${i}`)).status).toBe(401)
    expect((await attempt('10.9.9.99')).status).toBe(429)
  })
})
