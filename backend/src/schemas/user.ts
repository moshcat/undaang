import { z } from '@hono/zod-openapi'

export const userSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    email: z.email(),
    role: z.enum(['admin', 'user']),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  })
  .openapi('User')

export const registerBody = z
  .object({
    name: z.string().trim().min(1).max(100),
    email: z.email().trim().toLowerCase(),
    // bcrypt only uses the first 72 bytes.
    password: z.string().min(8).max(72),
  })
  .openapi('RegisterBody')

export const loginBody = z
  .object({
    email: z.email().trim().toLowerCase(),
    password: z.string().min(1).max(72),
  })
  .openapi('LoginBody')

export const sessionSchema = z.object({
  user: userSchema,
  token: z.string(),
  token_type: z.literal('Bearer'),
  expires_in: z.number(),
})
