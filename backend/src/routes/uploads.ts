import { createRoute, z } from '@hono/zod-openapi'
import { badRequest } from '../lib/errors'
import { createRouter } from '../lib/router'
import { requireAuth } from '../middlewares/auth'
import type { Tier } from '../models/theme'
import { dataOf, errors, json, objectId } from '../schemas/common'
import { findOwnedInvitation } from '../services/invitation'
import { assertFeature, assertGalleryLimit } from '../services/plan'
import { UPLOAD_URL_TTL_SECONDS, presignPut } from '../services/r2'

const MB = 1024 * 1024

const KINDS = {
  gallery: { types: ['image/jpeg', 'image/png', 'image/webp'], maxBytes: 5 * MB },
  couple: { types: ['image/jpeg', 'image/png', 'image/webp'], maxBytes: 5 * MB },
  music: { types: ['audio/mpeg', 'audio/mp4', 'audio/ogg'], maxBytes: 10 * MB },
} as const

const EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'audio/mpeg': 'mp3',
  'audio/mp4': 'm4a',
  'audio/ogg': 'ogg',
}

const presignBody = z
  .object({
    invitation_id: objectId,
    kind: z.enum(['gallery', 'couple', 'music']),
    content_type: z.string(),
    size: z.number().int().positive().openapi({ description: 'File size in bytes' }),
  })
  .openapi('PresignBody')

const presign = createRoute({
  method: 'post',
  path: '/presign',
  tags: ['Uploads'],
  summary: 'Get a presigned URL to upload a photo or song to R2',
  description:
    'PUT the file to upload_url with the same Content-Type. size must be the exact byte size of the file, because Content-Type and Content-Length are part of the signature. Then save public_url in the invitation.',
  security: [{ bearerAuth: [] }],
  middleware: [requireAuth],
  request: { body: json(presignBody, 'File to upload') },
  responses: {
    200: json(
      dataOf(
        z.object({
          upload_url: z.string(),
          public_url: z.string(),
          method: z.literal('PUT'),
          headers: z.record(z.string(), z.string()),
          expires_in: z.number(),
        }),
      ),
      'Presigned upload',
    ),
    400: errors[400],
    401: errors[401],
    402: errors[402],
    403: errors[403],
    404: errors[404],
    503: errors[503],
  },
})

export function uploadRoutes() {
  return createRouter().openapi(presign, async (c) => {
    const body = c.req.valid('json')
    const invitation = await findOwnedInvitation(c.get('user'), body.invitation_id)
    const kind = KINDS[body.kind]
    if (!(kind.types as readonly string[]).includes(body.content_type)) {
      throw badRequest(`content_type must be one of ${kind.types.join(', ')}`)
    }
    if (body.size > kind.maxBytes) {
      throw badRequest(`File is larger than ${kind.maxBytes / MB} MB`)
    }

    const plan = invitation.plan as Tier
    if (body.kind === 'music') assertFeature(plan, 'music')
    if (body.kind === 'gallery') assertGalleryLimit(plan, invitation.gallery.length + 1)

    const key = `invitations/${invitation.id}/${body.kind}/${crypto.randomUUID()}.${EXTENSIONS[body.content_type]}`
    const signed = await presignPut(key, body.content_type, body.size)
    return c.json(
      {
        data: {
          ...signed,
          method: 'PUT' as const,
          headers: { 'Content-Type': body.content_type },
          expires_in: UPLOAD_URL_TTL_SECONDS,
        },
      },
      200,
    )
  })
}
