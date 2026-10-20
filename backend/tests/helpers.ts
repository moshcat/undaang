import mongoose from 'mongoose'
import { createApp } from '../src/app'

export type TestApp = ReturnType<typeof createApp>

export async function resetDb() {
  // Unique indexes must exist before tests that rely on duplicate-key errors.
  await Promise.all(Object.values(mongoose.models).map((m) => m.init()))
  const collections = await mongoose.connection.db!.collections()
  await Promise.all(collections.map((c) => c.deleteMany({})))
}

type RequestOptions = {
  token?: string
  body?: unknown
  headers?: Record<string, string>
}

export function client(app: TestApp) {
  const send = async (method: string, path: string, options: RequestOptions = {}) => {
    const headers: Record<string, string> = { ...options.headers }
    if (options.token) headers.Authorization = `Bearer ${options.token}`
    let body: BodyInit | undefined
    if (options.body instanceof FormData || typeof options.body === 'string') {
      body = options.body
    } else if (options.body !== undefined) {
      headers['Content-Type'] = 'application/json'
      body = JSON.stringify(options.body)
    }
    const res = await app.request(path, { method, headers, body })
    const text = await res.text()
    let json: any
    try {
      json = text ? JSON.parse(text) : undefined
    } catch {
      json = undefined
    }
    return { status: res.status, headers: res.headers, json, text }
  }
  return {
    get: (path: string, o?: RequestOptions) => send('GET', path, o),
    post: (path: string, o?: RequestOptions) => send('POST', path, o),
    put: (path: string, o?: RequestOptions) => send('PUT', path, o),
    patch: (path: string, o?: RequestOptions) => send('PATCH', path, o),
    delete: (path: string, o?: RequestOptions) => send('DELETE', path, o),
  }
}

let userCounter = 0

export async function createUser(options: { role?: 'admin' | 'user'; email?: string } = {}) {
  const { UserModel } = await import('../src/models')
  const { signToken } = await import('../src/lib/jwt')
  userCounter += 1
  const user = await UserModel.create({
    name: `User ${userCounter}`,
    email: options.email ?? `user${userCounter}-${Date.now()}@mail.test`,
    password: await Bun.password.hash('password123', { algorithm: 'bcrypt', cost: 4 }),
    role: options.role ?? 'user',
  })
  const token = await signToken({ id: user.id, role: user.role as 'admin' | 'user' })
  return { user, token }
}

let themeCounter = 0

export async function createTheme(tier: 'free' | 'basic' | 'premium' = 'free') {
  const { ThemeModel } = await import('../src/models')
  themeCounter += 1
  return ThemeModel.create({
    code: `theme-${tier}-${themeCounter}`,
    name: `Theme ${themeCounter}`,
    tier,
  })
}

let invitationCounter = 0

export async function createInvitation(
  ownerId: string,
  options: {
    plan?: 'free' | 'basic' | 'premium'
    status?: 'draft' | 'published' | 'suspended'
    expiresAt?: Date
    themeTier?: 'free' | 'basic' | 'premium'
  } = {},
) {
  const { InvitationModel } = await import('../src/models')
  invitationCounter += 1
  const theme = await createTheme(options.themeTier ?? 'free')
  return InvitationModel.create({
    owner_id: ownerId,
    slug: `pasangan-${invitationCounter}-${Date.now()}`,
    theme_id: theme._id,
    plan: options.plan ?? 'free',
    status: options.status ?? 'draft',
    plan_expires_at: options.expiresAt ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    couple: { groom: { name: 'Raka' }, bride: { name: 'Sinta' } },
    events: [{ type: 'akad', start_at: new Date('2026-12-12T02:00:00Z'), venue: 'Masjid Raya' }],
  })
}
