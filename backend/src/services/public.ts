import { badRequest, gone, notFound } from '../lib/errors'
import { GuestModel, InvitationModel, RsvpModel, ThemeModel, type InvitationDoc } from '../models'
import type { Tier } from '../models/theme'
import { isExpired, rules } from './plan'

const WISHES_ON_PAGE = 20
const ANONYMOUS_MAX_PAX = 10

export async function findLiveInvitation(slug: string) {
  const invitation = await InvitationModel.findOne({
    slug: slug.toLowerCase(),
    status: 'published',
  })
  if (!invitation) throw notFound('Invitation not found')
  if (isExpired(invitation.plan_expires_at)) throw gone('This invitation is no longer active')
  return invitation
}

async function findGuest(invitation: InvitationDoc, code: string | undefined) {
  if (!code) return null
  return GuestModel.findOne({ invitation_id: invitation._id, code: code.toUpperCase() })
}

export async function openInvitation(slug: string, code: string | undefined) {
  const invitation = await findLiveInvitation(slug)
  const now = new Date()
  const [guest, theme] = await Promise.all([
    findGuest(invitation, code),
    ThemeModel.findById(invitation.theme_id),
    InvitationModel.updateOne({ _id: invitation._id }, { $inc: { view_count: 1 } }),
  ])
  // Only the first visit counts as opened; the filter keeps later visits from moving the date.
  if (guest && !guest.opened_at) {
    await GuestModel.updateOne({ _id: guest._id, opened_at: null }, { opened_at: now })
  }

  const plan = rules(invitation.plan as Tier)
  const settings = invitation.settings
  const showWishes = settings?.show_wishes !== false
  const wishes = showWishes
    ? await RsvpModel.find(
        { invitation_id: invitation._id, is_hidden: false, message: { $ne: '' } },
        { name: 1, message: 1, attendance: 1, createdAt: 1 },
      )
        .sort({ createdAt: -1 })
        .limit(WISHES_ON_PAGE)
    : []

  const json = invitation.toJSON() as Record<string, unknown>
  const groom = invitation.couple?.groom
  const bride = invitation.couple?.bride
  const coupleTitle = [groom?.nickname || groom?.name, bride?.nickname || bride?.name]
    .filter(Boolean)
    .join(' & ')
  const gallery = invitation.gallery.slice(0, plan.galleryLimit)

  return {
    slug: invitation.slug,
    theme: theme ? { code: theme.code, name: theme.name, defaults: theme.defaults } : null,
    couple: json.couple,
    events: json.events,
    gallery: gallery.map((g) => ({ url: g.url, caption: g.caption, order: g.order })),
    stories: json.stories,
    gift_accounts: plan.giftAccounts ? json.gift_accounts : [],
    settings: {
      primary_color: settings?.primary_color ?? theme?.defaults?.primary_color ?? null,
      music_url: plan.music ? (settings?.music_url ?? null) : null,
      show_wishes: showWishes,
    },
    watermark: plan.watermark,
    guest: guest ? { name: guest.name, group: guest.group, pax_quota: guest.pax_quota } : null,
    wishes: wishes.map((w) => w.toJSON()),
    og: {
      title: coupleTitle ? `The Wedding of ${coupleTitle}` : 'Undangan Pernikahan',
      image: gallery[0]?.url ?? groom?.photo_url ?? bride?.photo_url ?? null,
    },
  }
}

type RsvpInput = {
  name?: string
  attendance: 'hadir' | 'tidak_hadir' | 'ragu'
  pax: number
  message: string
  to?: string
}

export async function submitRsvp(slug: string, input: RsvpInput) {
  const invitation = await findLiveInvitation(slug)
  const guest = await findGuest(invitation, input.to)
  if (input.to && !guest) throw badRequest('The personal link code is not valid')

  const maxPax = guest?.pax_quota ?? ANONYMOUS_MAX_PAX
  const pax = input.attendance === 'tidak_hadir' ? 0 : input.pax
  if (pax > maxPax) {
    throw badRequest(`This invitation is for up to ${maxPax} people`, { max_pax: maxPax })
  }
  const name = guest?.name ?? input.name
  if (!name) throw badRequest('name is required')

  const fields = { name, attendance: input.attendance, pax, message: input.message }
  // A guest with a personal link keeps one RSVP and can change the answer later.
  if (guest) {
    const existing = await RsvpModel.findOne({ invitation_id: invitation._id, guest_id: guest._id })
    if (existing) {
      existing.set(fields)
      await existing.save()
      return { rsvp: existing, created: false }
    }
  }
  const rsvp = await RsvpModel.create({
    ...fields,
    invitation_id: invitation._id,
    guest_id: guest?._id ?? null,
  })
  return { rsvp, created: true }
}
