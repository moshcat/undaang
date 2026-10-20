import { createRoute } from '@hono/zod-openapi'
import { conflict, unauthorized } from '../lib/errors'
import { TOKEN_TTL_SECONDS, signToken } from '../lib/jwt'
import { createRouter } from '../lib/router'
import { requireAuth } from '../middlewares/auth'
import { limitByIp } from '../middlewares/rateLimit'
import { UserModel, type UserDoc } from '../models'
import { dataOf, errors, json } from '../schemas/common'
import { loginBody, registerBody, sessionSchema, userSchema } from '../schemas/user'
import type { Role } from '../types'

// Compared against when the email is unknown, so a miss costs as much as a wrong password.
const DUMMY_HASH = await Bun.password.hash('undaang-timing-guard', {
  algorithm: 'bcrypt',
  cost: 10,
})

async function session(user: UserDoc) {
  const token = await signToken({ id: user.id, role: user.role as Role })
  return {
    user: user.toJSON(),
    token,
    token_type: 'Bearer' as const,
    expires_in: TOKEN_TTL_SECONDS,
  }
}

const register = createRoute({
  method: 'post',
  path: '/register',
  tags: ['Auth'],
  summary: 'Register a new account',
  request: { body: json(registerBody, 'Account data') },
  responses: {
    201: json(dataOf(sessionSchema), 'Account created'),
    400: errors[400],
    409: { description: 'Email is already registered' },
  },
})

const login = createRoute({
  method: 'post',
  path: '/login',
  tags: ['Auth'],
  summary: 'Log in and receive a JWT',
  middleware: [limitByIp({ windowMs: 15 * 60 * 1000, limit: 10 })] as const,
  request: { body: json(loginBody, 'Credentials') },
  responses: {
    200: json(dataOf(sessionSchema), 'Logged in'),
    400: errors[400],
    401: { description: 'Wrong email or password' },
    429: errors[429],
  },
})

const me = createRoute({
  method: 'get',
  path: '/me',
  tags: ['Auth'],
  summary: 'Current user profile',
  security: [{ bearerAuth: [] }],
  middleware: [requireAuth] as const,
  responses: {
    200: json(dataOf(userSchema), 'Profile'),
    401: errors[401],
  },
})

export function authRoutes() {
  return createRouter()
    .openapi(register, async (c) => {
      const body = c.req.valid('json')
      if (await UserModel.exists({ email: body.email })) {
        throw conflict('Email is already registered')
      }
      const user = await UserModel.create({
        name: body.name,
        email: body.email,
        password: await Bun.password.hash(body.password, { algorithm: 'bcrypt', cost: 10 }),
      })
      return c.json({ data: await session(user) }, 201)
    })
    .openapi(login, async (c) => {
      const body = c.req.valid('json')
      const user = await UserModel.findOne({ email: body.email }).select('+password')
      const valid = await Bun.password.verify(body.password, user?.password ?? DUMMY_HASH)
      if (!user || !valid) throw unauthorized('Wrong email or password')
      return c.json({ data: await session(user) }, 200)
    })
    .openapi(me, async (c) => {
      const user = await UserModel.findById(c.get('user').id)
      if (!user) throw unauthorized('Account no longer exists')
      return c.json({ data: user.toJSON() }, 200)
    })
}
