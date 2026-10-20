import { z } from '@hono/zod-openapi'

export const objectId = z
  .string()
  .regex(/^[a-f\d]{24}$/i, 'Must be a valid id')
  .openapi({ example: '6500a1b2c3d4e5f678905678' })

export const paginationQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export const errorBody = z
  .object({
    error: z.object({
      code: z.string(),
      message: z.string(),
      details: z.unknown().optional(),
    }),
  })
  .openapi('Error')

export function pageMeta(page: number, limit: number, total: number) {
  return { page, limit, total, total_pages: Math.ceil(total / limit) }
}

export const pageMetaSchema = z.object({
  page: z.number(),
  limit: z.number(),
  total: z.number(),
  total_pages: z.number(),
})

export function dataOf<T extends z.ZodType>(schema: T) {
  return z.object({ data: schema })
}

export function pageOf<T extends z.ZodType>(schema: T) {
  return z.object({ data: z.array(schema), meta: pageMetaSchema })
}

export function json<T extends z.ZodType>(schema: T, description: string) {
  return { content: { 'application/json': { schema } }, description }
}

export const errors = {
  400: { description: 'Invalid request' },
  401: { description: 'Missing or invalid token' },
  402: { description: 'Feature is not included in the invitation plan' },
  403: { description: 'Not the owner, or role not allowed' },
  404: { description: 'Not found' },
  409: { description: 'Conflict with existing data' },
  410: { description: 'Invitation has expired' },
  422: { description: 'Required data is incomplete' },
  429: { description: 'Too many requests' },
  502: { description: 'Payment gateway error' },
  503: { description: 'External service not configured' },
} as const
