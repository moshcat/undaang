import { z } from '@hono/zod-openapi'
import { objectId, paginationQuery, plainText } from './common'

const phone = z
  .string()
  .trim()
  .regex(/^\+?[0-9 -]{6,20}$/, 'Digits, spaces, dashes and an optional leading +')

export const guestBody = z
  .object({
    name: plainText(100).pipe(z.string().min(1)),
    phone: phone.nullable().optional(),
    group: plainText(50).nullable().optional(),
    pax_quota: z.number().int().min(1).max(20).optional(),
  })
  .openapi('GuestBody')

export const guestUpdateBody = guestBody.partial().openapi('GuestUpdateBody')

export const csvRow = z.object({
  name: plainText(100).pipe(z.string().min(1, 'name is required')),
  phone: z
    .string()
    .trim()
    .transform((v) => v || null)
    .pipe(phone.nullable()),
  group: z
    .string()
    .transform((v) => v.trim() || null)
    .pipe(plainText(50).nullable()),
  pax_quota: z
    .string()
    .trim()
    .transform((v) => (v === '' ? 2 : Number(v)))
    .pipe(z.number().int().min(1).max(20)),
})

export const listGuestsQuery = paginationQuery.extend({
  q: z.string().trim().max(100).optional(),
  group: z.string().trim().max(50).optional(),
  opened: z.enum(['true', 'false']).optional(),
  sort: z
    .enum(['name', '-name', 'createdAt', '-createdAt', 'opened_at', '-opened_at'])
    .default('-createdAt'),
})

export const guestParams = z.object({ id: objectId, guestId: objectId })

export const guestSchema = z
  .object({
    id: z.string(),
    invitation_id: z.string(),
    name: z.string(),
    code: z.string(),
    phone: z.string().nullable(),
    group: z.string().nullable(),
    pax_quota: z.number(),
    opened_at: z.iso.datetime().nullable(),
    personal_url: z.string(),
    share_text: z.string(),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  })
  .openapi('Guest')
