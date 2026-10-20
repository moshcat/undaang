import { createRoute, z } from '@hono/zod-openapi'
import { isDbUp } from '../config/db'
import { createRouter } from '../lib/router'
import { dataOf, json } from '../schemas/common'

const route = createRoute({
  method: 'get',
  path: '/',
  tags: ['System'],
  summary: 'Service health',
  responses: {
    200: json(
      dataOf(z.object({ status: z.literal('ok'), db: z.enum(['up', 'down']) })),
      'Service is running',
    ),
  },
})

export const healthRoutes = createRouter().openapi(route, (c) =>
  c.json(
    { data: { status: 'ok' as const, db: isDbUp() ? ('up' as const) : ('down' as const) } },
    200,
  ),
)
