import { createRoute, z } from '@hono/zod-openapi'
import { conflict, notFound } from '../lib/errors'
import { createRouter } from '../lib/router'
import { requireAuth, requireRole } from '../middlewares/auth'
import { ThemeModel } from '../models'
import { dataOf, errors, json, objectId, tier } from '../schemas/common'
import { themeBody, themeSchema, themeUpdateBody } from '../schemas/theme'

const listThemes = createRoute({
  method: 'get',
  path: '/',
  tags: ['Themes'],
  summary: 'Active theme catalog',
  request: { query: z.object({ tier: tier.optional() }) },
  responses: { 200: json(dataOf(z.array(themeSchema)), 'Themes'), 400: errors[400] },
})

export function themeRoutes() {
  return createRouter().openapi(listThemes, async (c) => {
    const { tier } = c.req.valid('query')
    const themes = await ThemeModel.find({ is_active: true, ...(tier && { tier }) }).sort({
      tier: 1,
      name: 1,
    })
    return c.json({ data: themes.map((t) => t.toJSON()) }, 200)
  })
}

const createTheme = createRoute({
  method: 'post',
  path: '/',
  tags: ['Admin'],
  summary: 'Add a theme to the catalog',
  security: [{ bearerAuth: [] }],
  middleware: [requireAuth, requireRole('admin')],
  request: { body: json(themeBody, 'Theme') },
  responses: {
    201: json(dataOf(themeSchema), 'Theme created'),
    400: errors[400],
    401: errors[401],
    403: errors[403],
    409: { description: 'Theme code already exists' },
  },
})

const updateTheme = createRoute({
  method: 'put',
  path: '/{id}',
  tags: ['Admin'],
  summary: 'Update a catalog theme',
  security: [{ bearerAuth: [] }],
  middleware: [requireAuth, requireRole('admin')],
  request: { params: z.object({ id: objectId }), body: json(themeUpdateBody, 'Fields to change') },
  responses: {
    200: json(dataOf(themeSchema), 'Theme updated'),
    400: errors[400],
    401: errors[401],
    403: errors[403],
    404: errors[404],
    409: { description: 'Theme code already exists' },
  },
})

export function adminThemeRoutes() {
  return createRouter()
    .openapi(createTheme, async (c) => {
      const body = c.req.valid('json')
      if (await ThemeModel.exists({ code: body.code })) throw conflict('Theme code already exists')
      const theme = await ThemeModel.create(body)
      return c.json({ data: theme.toJSON() }, 201)
    })
    .openapi(updateTheme, async (c) => {
      const { id } = c.req.valid('param')
      const body = c.req.valid('json')
      if (body.code && (await ThemeModel.exists({ code: body.code, _id: { $ne: id } }))) {
        throw conflict('Theme code already exists')
      }
      const theme = await ThemeModel.findByIdAndUpdate(id, body, {
        returnDocument: 'after',
        runValidators: true,
      })
      if (!theme) throw notFound('Theme not found')
      return c.json({ data: theme.toJSON() }, 200)
    })
}
