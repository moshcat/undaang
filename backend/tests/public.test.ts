import { beforeEach, describe, expect, it } from 'bun:test'
import { createApp } from '../src/app'
import { GuestModel, InvitationModel, RsvpModel } from '../src/models'
import { client, createInvitation, createUser, resetDb } from './helpers'

const api = client(createApp())
const pageUrl = (slug: string) => `/api/v1/public/invitations/${slug}`

let ipCounter = 0
const freshIp = () => ({
  'x-forwarded-for': `192.168.${Math.floor(ipCounter / 250)}.${ipCounter++ % 250}`,
})

async function published(options: Parameters<typeof createInvitation>[1] = {}) {
  const { user } = await createUser()
  return createInvitation(user.id, { status: 'published', ...options })
}

beforeEach(resetDb)

describe('GET /public/invitations/:slug', () => {
  it('serves the content without login and counts the visit', async () => {
    const invitation = await published()
    const res = await api.get(pageUrl(invitation.slug))
    expect(res.status).toBe(200)
    expect(res.json.data).toMatchObject({
      slug: invitation.slug,
      couple: { groom: { name: 'Raka' }, bride: { name: 'Sinta' } },
      watermark: true,
      guest: null,
      og: { title: 'The Wedding of Raka & Sinta' },
    })
    expect(res.json.data.owner_id).toBeUndefined()
    expect(res.json.data.view_count).toBeUndefined()
    await api.get(pageUrl(invitation.slug))
    expect((await InvitationModel.findById(invitation._id))!.view_count).toBe(2)
  })

  it('greets the guest and records only the first opening', async () => {
    const invitation = await published()
    await GuestModel.create({ invitation_id: invitation._id, name: 'Budi', code: 'ABCDEFGH' })
    const first = await api.get(`${pageUrl(invitation.slug)}?to=abcdefgh`)
    expect(first.json.data.guest).toMatchObject({ name: 'Budi', pax_quota: 2 })
    const openedAt = (await GuestModel.findOne({ code: 'ABCDEFGH' }))!.opened_at
    expect(openedAt).toBeInstanceOf(Date)
    await Bun.sleep(5)
    await api.get(`${pageUrl(invitation.slug)}?to=ABCDEFGH`)
    expect((await GuestModel.findOne({ code: 'ABCDEFGH' }))!.opened_at).toEqual(openedAt)
  })

  it('answers 404 for drafts, suspended and unknown slugs', async () => {
    const { user } = await createUser()
    const draft = await createInvitation(user.id)
    const suspended = await createInvitation(user.id, { status: 'suspended' })
    expect((await api.get(pageUrl(draft.slug))).status).toBe(404)
    expect((await api.get(pageUrl(suspended.slug))).status).toBe(404)
    expect((await api.get(pageUrl('tidak-ada'))).status).toBe(404)
  })

  it('answers 410 once the plan period has ended', async () => {
    const invitation = await published({ expiresAt: new Date(Date.now() - 1000) })
    expect((await api.get(pageUrl(invitation.slug))).status).toBe(410)
  })

  it('hides gift accounts and music the plan does not include', async () => {
    const invitation = await published()
    invitation.set('gift_accounts', [{ bank: 'BCA', account_no: '123456', account_name: 'Raka' }])
    invitation.set('settings.music_url', 'https://media.test.local/song.mp3')
    await invitation.save()
    const res = await api.get(pageUrl(invitation.slug))
    expect(res.json.data.gift_accounts).toEqual([])
    expect(res.json.data.settings.music_url).toBeNull()
  })

  it('shows visible wishes only', async () => {
    const invitation = await published({ plan: 'basic' })
    await RsvpModel.create([
      { invitation_id: invitation._id, name: 'A', attendance: 'hadir', message: 'Selamat ya' },
      {
        invitation_id: invitation._id,
        name: 'B',
        attendance: 'hadir',
        message: 'spam',
        is_hidden: true,
      },
      { invitation_id: invitation._id, name: 'C', attendance: 'ragu', message: '' },
    ])
    const res = await api.get(pageUrl(invitation.slug))
    expect(res.json.data.watermark).toBe(false)
    expect(res.json.data.wishes.map((w: { name: string }) => w.name)).toEqual(['A'])
  })
})

describe('POST /public/invitations/:slug/rsvps', () => {
  it('records an anonymous RSVP and strips HTML from the wish', async () => {
    const invitation = await published()
    const res = await api.post(`${pageUrl(invitation.slug)}/rsvps`, {
      headers: freshIp(),
      body: {
        name: 'Dewi',
        attendance: 'hadir',
        pax: 2,
        message: '<script>alert("x")</script>Selamat menempuh hidup baru!',
      },
    })
    expect(res.status).toBe(201)
    expect(res.json.data).toMatchObject({
      name: 'Dewi',
      pax: 2,
      message: 'Selamat menempuh hidup baru!',
    })
  })

  it('uses the guest name and quota from the personal link and updates on resubmit', async () => {
    const invitation = await published()
    const guest = await GuestModel.create({
      invitation_id: invitation._id,
      name: 'Budi',
      code: 'ABCDEFGH',
      pax_quota: 3,
    })
    const url = `${pageUrl(invitation.slug)}/rsvps`
    const over = await api.post(url, {
      headers: freshIp(),
      body: { attendance: 'hadir', pax: 4, to: 'ABCDEFGH' },
    })
    expect(over.status).toBe(400)
    expect(over.json.error.details.max_pax).toBe(3)

    const first = await api.post(url, {
      headers: freshIp(),
      body: { name: 'Nama Lain', attendance: 'hadir', pax: 3, to: 'ABCDEFGH' },
    })
    expect(first.status).toBe(201)
    expect(first.json.data.name).toBe('Budi')

    const second = await api.post(url, {
      headers: freshIp(),
      body: { attendance: 'tidak_hadir', pax: 3, to: 'ABCDEFGH' },
    })
    expect(second.status).toBe(200)
    expect(second.json.data).toMatchObject({ attendance: 'tidak_hadir', pax: 0 })
    expect(await RsvpModel.countDocuments({ guest_id: guest._id })).toBe(1)
  })

  it('rejects NoSQL operators and missing names with 400', async () => {
    const invitation = await published()
    const url = `${pageUrl(invitation.slug)}/rsvps`
    const operator = await api.post(url, {
      headers: freshIp(),
      body: { name: { $gt: '' }, attendance: { $ne: 'x' } },
    })
    const unknownCode = await api.post(url, {
      headers: freshIp(),
      body: { attendance: 'hadir', to: 'ZZZZZZZZ' },
    })
    const noName = await api.post(url, { headers: freshIp(), body: { attendance: 'hadir' } })
    expect(operator.status).toBe(400)
    expect(unknownCode.status).toBe(400)
    expect(noName.status).toBe(400)
    expect(await RsvpModel.countDocuments()).toBe(0)
  })

  it('rate limits per IP with 429', async () => {
    const invitation = await published()
    const headers = { 'x-forwarded-for': '203.0.113.9' }
    const send = () =>
      api.post(`${pageUrl(invitation.slug)}/rsvps`, {
        headers,
        body: { name: 'Spammer', attendance: 'ragu', pax: 1 },
      })
    for (let i = 0; i < 20; i++) expect((await send()).status).toBe(201)
    expect((await send()).status).toBe(429)
  })

  it('answers 404 for a draft invitation', async () => {
    const { user } = await createUser()
    const draft = await createInvitation(user.id)
    const res = await api.post(`${pageUrl(draft.slug)}/rsvps`, {
      headers: freshIp(),
      body: { name: 'Dewi', attendance: 'hadir' },
    })
    expect(res.status).toBe(404)
  })
})
