import { z } from '@hono/zod-openapi'
import { hexColor, tier } from './common'

export const themeSchema = z
  .object({
    id: z.string(),
    code: z.string(),
    name: z.string(),
    tier,
    preview_url: z.string().nullable(),
    defaults: z.object({ primary_color: z.string(), font: z.string().nullable() }),
    is_active: z.boolean(),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  })
  .openapi('Theme')

export const themeBody = z
  .object({
    code: z
      .string()
      .trim()
      .toLowerCase()
      .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Use lowercase words joined by dashes')
      .max(50),
    name: z.string().trim().min(1).max(100),
    tier,
    preview_url: z.url().nullable().optional(),
    defaults: z
      .object({ primary_color: hexColor, font: z.string().trim().max(100).nullable().optional() })
      .optional(),
    is_active: z.boolean().optional(),
  })
  .openapi('ThemeBody')

export const themeUpdateBody = themeBody.partial().openapi('ThemeUpdateBody')
