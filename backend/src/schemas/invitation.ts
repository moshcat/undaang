import { z } from '@hono/zod-openapi'
import { hexColor, httpUrl, objectId, paginationQuery, plainText, tier } from './common'

export const slug = z
  .string()
  .trim()
  .toLowerCase()
  .min(3)
  .max(60)
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Use lowercase letters, numbers and single dashes')
  .openapi({ example: 'raka-dan-sinta' })

const person = z.object({
  name: plainText(100).default(''),
  nickname: plainText(50).default(''),
  parents: plainText(200).default(''),
  photo_url: httpUrl.nullable().default(null),
})

const event = z
  .object({
    type: z.enum(['akad', 'pemberkatan', 'resepsi']),
    start_at: z.iso.datetime({ offset: true }),
    end_at: z.iso.datetime({ offset: true }).nullable().default(null),
    venue: plainText(200).pipe(z.string().min(1)),
    address: plainText(500).default(''),
    maps_url: httpUrl.nullable().default(null),
  })
  .refine((e) => !e.end_at || new Date(e.end_at) >= new Date(e.start_at), {
    message: 'end_at must not be before start_at',
    path: ['end_at'],
  })

const galleryItem = z.object({
  url: httpUrl,
  caption: plainText(200).default(''),
  order: z.number().int().min(0).default(0),
})

const story = z.object({
  date: z.iso.date().nullable().default(null),
  title: plainText(100).pipe(z.string().min(1)),
  body: plainText(2000).default(''),
})

const giftAccount = z.object({
  bank: plainText(50).pipe(z.string().min(1)),
  account_no: z
    .string()
    .trim()
    .regex(/^[0-9 -]{4,40}$/, 'Digits, spaces and dashes only'),
  account_name: plainText(100).pipe(z.string().min(1)),
})

const settings = z.object({
  primary_color: hexColor.nullable().optional(),
  music_url: httpUrl.nullable().optional(),
  show_wishes: z.boolean().optional(),
})

export const createInvitationBody = z
  .object({
    slug,
    theme_id: objectId,
    couple: z.object({ groom: person.optional(), bride: person.optional() }).optional(),
  })
  .openapi('CreateInvitationBody')

export const updateInvitationBody = z
  .object({
    slug: slug.optional(),
    theme_id: objectId.optional(),
    couple: z.object({ groom: person.optional(), bride: person.optional() }).optional(),
    events: z.array(event).max(10).optional(),
    gallery: z.array(galleryItem).max(50).optional(),
    stories: z.array(story).max(20).optional(),
    gift_accounts: z.array(giftAccount).max(5).optional(),
    settings: settings.optional(),
  })
  .openapi('UpdateInvitationBody')

export const publishBody = z.object({ published: z.boolean() }).openapi('PublishBody')

export const listInvitationsQuery = paginationQuery.extend({
  status: z.enum(['draft', 'published', 'suspended']).optional(),
})

const personOut = z.object({
  name: z.string(),
  nickname: z.string(),
  parents: z.string(),
  photo_url: z.string().nullable(),
})

export const invitationSchema = z
  .object({
    id: z.string(),
    owner_id: z.string(),
    slug: z.string(),
    theme_id: z.string(),
    status: z.enum(['draft', 'published', 'suspended']),
    plan: tier,
    plan_expires_at: z.iso.datetime(),
    couple: z.object({ groom: personOut, bride: personOut }),
    events: z.array(
      z.object({
        id: z.string(),
        type: z.string(),
        start_at: z.iso.datetime(),
        end_at: z.iso.datetime().nullable(),
        venue: z.string(),
        address: z.string(),
        maps_url: z.string().nullable(),
      }),
    ),
    gallery: z.array(z.object({ url: z.string(), caption: z.string(), order: z.number() })),
    stories: z.array(
      z.object({ date: z.iso.datetime().nullable(), title: z.string(), body: z.string() }),
    ),
    gift_accounts: z.array(
      z.object({ bank: z.string(), account_no: z.string(), account_name: z.string() }),
    ),
    settings: z.object({
      primary_color: z.string().nullable(),
      music_url: z.string().nullable(),
      show_wishes: z.boolean(),
    }),
    view_count: z.number(),
    limits: z.object({
      guest_quota: z.number(),
      gallery_limit: z.number(),
      theme_tiers: z.array(tier),
      watermark: z.boolean(),
      music: z.boolean(),
      gift_accounts: z.boolean(),
      csv_import: z.boolean(),
      rsvp_export: z.boolean(),
    }),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  })
  .openapi('Invitation')
