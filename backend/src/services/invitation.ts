import mongoose, { isValidObjectId } from 'mongoose'
import {
  badRequest,
  conflict,
  forbidden,
  notFound,
  paymentRequired,
  unprocessable,
} from '../lib/errors'
import { GuestModel, InvitationModel, RsvpModel, ThemeModel, type InvitationDoc } from '../models'
import type { Tier } from '../models/theme'
import type { z } from '@hono/zod-openapi'
import type { updateInvitationBody } from '../schemas/invitation'
import type { AuthUser } from '../types'
import { assertFeature, assertGalleryLimit, assertThemeAllowed, isExpired, rules } from './plan'

type UpdateBody = z.infer<typeof updateInvitationBody>

export async function findOwnedInvitation(user: AuthUser, id: string | undefined) {
  if (!id || !isValidObjectId(id)) throw notFound('Invitation not found')
  const invitation = await InvitationModel.findById(id)
  if (!invitation) throw notFound('Invitation not found')
  if (user.role !== 'admin' && !invitation.owner_id.equals(user.id)) throw forbidden()
  return invitation
}

export function serializeInvitation(invitation: InvitationDoc) {
  const plan = rules(invitation.plan as Tier)
  return {
    ...invitation.toJSON(),
    limits: {
      guest_quota: plan.guestQuota,
      gallery_limit: plan.galleryLimit,
      theme_tiers: plan.themeTiers,
      watermark: plan.watermark,
      music: plan.music,
      gift_accounts: plan.giftAccounts,
      csv_import: plan.csvImport,
      rsvp_export: plan.rsvpExport,
    },
  }
}

export async function findActiveTheme(themeId: string) {
  const theme = await ThemeModel.findOne({ _id: themeId, is_active: true })
  if (!theme) throw badRequest('Theme not found or inactive')
  return theme
}

export async function assertSlugFree(slug: string, exceptId?: string) {
  const taken = await InvitationModel.exists({
    slug,
    ...(exceptId && { _id: { $ne: exceptId } }),
  })
  if (taken) throw conflict('Slug is already taken')
}

export async function applyUpdate(invitation: InvitationDoc, body: UpdateBody) {
  const plan = invitation.plan as Tier

  if (body.slug && body.slug !== invitation.slug) {
    await assertSlugFree(body.slug, invitation.id)
    invitation.slug = body.slug
  }
  if (body.theme_id && !invitation.theme_id.equals(body.theme_id)) {
    const theme = await findActiveTheme(body.theme_id)
    assertThemeAllowed(plan, theme.tier)
    invitation.theme_id = theme._id
  }
  if (body.couple?.groom) invitation.set('couple.groom', body.couple.groom)
  if (body.couple?.bride) invitation.set('couple.bride', body.couple.bride)
  if (body.events) invitation.set('events', body.events)
  if (body.gallery) {
    assertGalleryLimit(plan, body.gallery.length)
    invitation.set('gallery', body.gallery)
  }
  if (body.stories) invitation.set('stories', body.stories)
  if (body.gift_accounts) {
    if (body.gift_accounts.length > 0) assertFeature(plan, 'giftAccounts')
    invitation.set('gift_accounts', body.gift_accounts)
  }
  if (body.settings) {
    const { primary_color, music_url, show_wishes } = body.settings
    if (music_url) assertFeature(plan, 'music')
    if (primary_color !== undefined) invitation.set('settings.primary_color', primary_color)
    if (music_url !== undefined) invitation.set('settings.music_url', music_url)
    if (show_wishes !== undefined) invitation.set('settings.show_wishes', show_wishes)
  }
  await invitation.save()
}

export async function setPublished(invitation: InvitationDoc, published: boolean) {
  if (invitation.status === 'suspended') {
    throw forbidden('This invitation is suspended by an admin')
  }
  if (!published) {
    invitation.status = 'draft'
    await invitation.save()
    return
  }

  const missing: string[] = []
  if (!invitation.couple?.groom?.name) missing.push('couple.groom.name')
  if (!invitation.couple?.bride?.name) missing.push('couple.bride.name')
  if (invitation.events.length === 0) missing.push('events')
  if (missing.length > 0) {
    throw unprocessable('Fill in the required data before publishing', { missing })
  }

  const plan = invitation.plan as Tier
  const theme = await ThemeModel.findById(invitation.theme_id)
  if (!theme) throw unprocessable('Pick a theme before publishing', { missing: ['theme_id'] })
  assertThemeAllowed(plan, theme.tier)
  if (isExpired(invitation.plan_expires_at)) {
    throw paymentRequired('The plan period has ended, upgrade to publish again', { plan })
  }

  invitation.status = 'published'
  await invitation.save()
}

export async function deleteInvitation(invitation: InvitationDoc) {
  await mongoose.connection.transaction(async (session) => {
    await GuestModel.deleteMany({ invitation_id: invitation._id }, { session })
    await RsvpModel.deleteMany({ invitation_id: invitation._id }, { session })
    await invitation.deleteOne({ session })
  })
}
