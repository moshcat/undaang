import { beforeEach, describe, expect, it } from 'bun:test'
import { createApp } from '../src/app'
import { GuestModel, InvitationModel, RsvpModel } from '../src/models'
import { client, createInvitation, createTheme, createUser, resetDb } from './helpers'

const api = client(createApp())
const base = '/api/v1/invitations'

beforeEach(resetDb)

describe('create and list', () => {
  it('creates a free draft with a 30 day period', async () => {
    const { token } = await createUser()
    const theme = await createTheme('free')
    const res = await api.post(base, {
      token,
      body: { slug: 'Raka-Dan-Sinta', theme_id: theme.id, couple: { groom: { name: 'Raka' } } },
    })
    expect(res.status).toBe(201)
    expect(res.json.data).toMatchObject({
      slug: 'raka-dan-sinta',
      status: 'draft',
      plan: 'free',
      couple: { groom: { name: 'Raka' }, bride: { name: '' } },
    })
    expect(res.json.data.limits).toMatchObject({ guest_quota: 50, watermark: true })
    const days = (new Date(res.json.data.plan_expires_at).getTime() - Date.now()) / 86_400_000
    expect(Math.round(days)).toBe(30)
  })

  it('rejects a taken slug with 409', async () => {
    const { token } = await createUser()
    const theme = await createTheme('free')
    const body = { slug: 'raka-dan-sinta', theme_id: theme.id }
    await api.post(base, { token, body })
    expect((await api.post(base, { token, body })).status).toBe(409)
  })

  it('rejects a premium theme on the free plan with 402', async () => {
    const { token } = await createUser()
    const theme = await createTheme('premium')
    const res = await api.post(base, { token, body: { slug: 'raka-sinta', theme_id: theme.id } })
    expect(res.status).toBe(402)
    expect(res.json.error.details.required_plan).toBe('premium')
  })

  it('rejects a malformed slug with 400', async () => {
    const { token } = await createUser()
    const theme = await createTheme('free')
    const res = await api.post(base, { token, body: { slug: 'raka sinta!', theme_id: theme.id } })
    expect(res.status).toBe(400)
  })

  it('lists only my invitations with pagination', async () => {
    const me = await createUser()
    const other = await createUser()
    for (let i = 0; i < 3; i++) await createInvitation(me.user.id)
    await createInvitation(other.user.id)
    const res = await api.get(`${base}?limit=2&page=2`, { token: me.token })
    expect(res.status).toBe(200)
    expect(res.json.data).toHaveLength(1)
    expect(res.json.meta).toEqual({ page: 2, limit: 2, total: 3, total_pages: 2 })
  })
})

describe('ownership', () => {
  it("answers 403 for someone else's invitation and 404 for a missing one", async () => {
    const owner = await createUser()
    const stranger = await createUser()
    const invitation = await createInvitation(owner.user.id)
    expect((await api.get(`${base}/${invitation.id}`, { token: stranger.token })).status).toBe(403)
    expect(
      (await api.put(`${base}/${invitation.id}`, { token: stranger.token, body: {} })).status,
    ).toBe(403)
    expect((await api.get(`${base}/6500a1b2c3d4e5f678905678`, { token: owner.token })).status).toBe(
      404,
    )
  })

  it('lets an admin open any invitation', async () => {
    const owner = await createUser()
    const admin = await createUser({ role: 'admin' })
    const invitation = await createInvitation(owner.user.id)
    expect((await api.get(`${base}/${invitation.id}`, { token: admin.token })).status).toBe(200)
  })

  it('answers 401 without a token', async () => {
    expect((await api.get(base)).status).toBe(401)
  })
})

describe('PUT /invitations/:id', () => {
  it('replaces the sections that are sent and strips HTML', async () => {
    const { user, token } = await createUser()
    const invitation = await createInvitation(user.id)
    const res = await api.put(`${base}/${invitation.id}`, {
      token,
      body: {
        couple: { bride: { name: '<b>Sinta</b> Dewi', parents: 'Bapak Made & Ibu Ayu' } },
        events: [
          {
            type: 'resepsi',
            start_at: '2026-12-12T11:00:00+08:00',
            end_at: '2026-12-12T14:00:00+08:00',
            venue: 'Gedung Serbaguna',
            maps_url: 'https://maps.google.com/?q=-8.65,115.21',
          },
        ],
        stories: [{ date: '2024-02-14', title: 'Pertama bertemu', body: 'Di kampus.' }],
        settings: { primary_color: '#8a9a5b', show_wishes: false },
      },
    })
    expect(res.status).toBe(200)
    expect(res.json.data.couple.bride).toMatchObject({
      name: 'Sinta Dewi',
      parents: 'Bapak Made & Ibu Ayu',
    })
    expect(res.json.data.couple.groom.name).toBe('Raka')
    expect(res.json.data.events).toHaveLength(1)
    expect(res.json.data.events[0].type).toBe('resepsi')
    expect(res.json.data.settings).toMatchObject({ primary_color: '#8a9a5b', show_wishes: false })
  })

  it('rejects an event that ends before it starts', async () => {
    const { user, token } = await createUser()
    const invitation = await createInvitation(user.id)
    const res = await api.put(`${base}/${invitation.id}`, {
      token,
      body: {
        events: [
          {
            type: 'akad',
            start_at: '2026-12-12T10:00:00Z',
            end_at: '2026-12-12T09:00:00Z',
            venue: 'Masjid',
          },
        ],
      },
    })
    expect(res.status).toBe(400)
  })

  it('rejects javascript: URLs', async () => {
    const { user, token } = await createUser()
    const invitation = await createInvitation(user.id)
    const res = await api.put(`${base}/${invitation.id}`, {
      token,
      body: { gallery: [{ url: 'javascript:alert(1)' }] },
    })
    expect(res.status).toBe(400)
  })

  it('enforces plan limits with 402 on the free plan', async () => {
    const { user, token } = await createUser()
    const invitation = await createInvitation(user.id)
    const premiumTheme = await createTheme('premium')
    const photos = Array.from({ length: 7 }, (_, i) => ({ url: `https://media.test/${i}.jpg` }))
    const cases = [
      { theme_id: premiumTheme.id },
      { gallery: photos },
      { settings: { music_url: 'https://media.test/song.mp3' } },
      { gift_accounts: [{ bank: 'BCA', account_no: '1234567890', account_name: 'Raka' }] },
    ]
    for (const body of cases) {
      const res = await api.put(`${base}/${invitation.id}`, { token, body })
      expect(res.status).toBe(402)
    }
  })

  it('allows music and gift accounts on the basic plan', async () => {
    const { user, token } = await createUser()
    const invitation = await createInvitation(user.id, { plan: 'basic' })
    const res = await api.put(`${base}/${invitation.id}`, {
      token,
      body: {
        settings: { music_url: 'https://media.test/song.mp3' },
        gift_accounts: [{ bank: 'BCA', account_no: '1234 5678 90', account_name: 'Raka' }],
      },
    })
    expect(res.status).toBe(200)
    expect(res.json.data.gift_accounts).toHaveLength(1)
  })
})

describe('PATCH /invitations/:id/publish', () => {
  it('publishes when the required data is complete, then unpublishes', async () => {
    const { user, token } = await createUser()
    const invitation = await createInvitation(user.id)
    const url = `${base}/${invitation.id}/publish`
    const on = await api.patch(url, { token, body: { published: true } })
    expect(on.status).toBe(200)
    expect(on.json.data.status).toBe('published')
    const off = await api.patch(url, { token, body: { published: false } })
    expect(off.json.data.status).toBe('draft')
  })

  it('answers 422 and lists what is missing', async () => {
    const { user, token } = await createUser()
    const invitation = await createInvitation(user.id)
    invitation.set('events', [])
    invitation.set('couple.bride.name', '')
    await invitation.save()
    const res = await api.patch(`${base}/${invitation.id}/publish`, {
      token,
      body: { published: true },
    })
    expect(res.status).toBe(422)
    expect(res.json.error.details.missing).toEqual(['couple.bride.name', 'events'])
  })

  it('answers 403 for a suspended invitation', async () => {
    const { user, token } = await createUser()
    const invitation = await createInvitation(user.id, { status: 'suspended' })
    const res = await api.patch(`${base}/${invitation.id}/publish`, {
      token,
      body: { published: true },
    })
    expect(res.status).toBe(403)
  })

  it('answers 402 when the plan period has ended', async () => {
    const { user, token } = await createUser()
    const invitation = await createInvitation(user.id, { expiresAt: new Date(Date.now() - 1000) })
    const res = await api.patch(`${base}/${invitation.id}/publish`, {
      token,
      body: { published: true },
    })
    expect(res.status).toBe(402)
  })
})

describe('DELETE /invitations/:id', () => {
  it('removes the invitation with its guests and RSVPs', async () => {
    const { user, token } = await createUser()
    const invitation = await createInvitation(user.id)
    await GuestModel.create({ invitation_id: invitation._id, name: 'Budi', code: 'ABCDEFGH' })
    await RsvpModel.create({ invitation_id: invitation._id, name: 'Budi', attendance: 'hadir' })
    const res = await api.delete(`${base}/${invitation.id}`, { token })
    expect(res.status).toBe(200)
    expect(await InvitationModel.countDocuments()).toBe(0)
    expect(await GuestModel.countDocuments()).toBe(0)
    expect(await RsvpModel.countDocuments()).toBe(0)
    expect((await api.delete(`${base}/${invitation.id}`, { token })).status).toBe(404)
  })
})
