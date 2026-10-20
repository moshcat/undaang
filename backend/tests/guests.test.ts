import { beforeEach, describe, expect, it } from 'bun:test'
import { createApp } from '../src/app'
import { GuestModel } from '../src/models'
import { client, createInvitation, createUser, resetDb } from './helpers'

const api = client(createApp())
const guestsUrl = (id: string) => `/api/v1/invitations/${id}/guests`

function csvForm(text: string, name = 'tamu.csv') {
  const form = new FormData()
  form.append('file', new File([text], name, { type: 'text/csv' }))
  return form
}

async function seedGuests(invitationId: string, count: number) {
  await GuestModel.insertMany(
    Array.from({ length: count }, (_, i) => ({
      invitation_id: invitationId,
      name: `Tamu ${i}`,
      code: `CODE${String(i).padStart(4, '0')}`,
    })),
  )
}

beforeEach(resetDb)

describe('POST /invitations/:id/guests', () => {
  it('adds a guest with an 8 character code, link and share text', async () => {
    const { user, token } = await createUser()
    const invitation = await createInvitation(user.id)
    const res = await api.post(guestsUrl(invitation.id), {
      token,
      body: { name: 'Budi Santoso', phone: '+62 812-3456-7890', group: 'teman kantor' },
    })
    expect(res.status).toBe(201)
    const guest = res.json.data
    expect(guest.code).toMatch(/^[A-HJ-NP-Z2-9]{8}$/)
    expect(guest.pax_quota).toBe(2)
    expect(guest.opened_at).toBeNull()
    expect(guest.personal_url).toBe(`http://localhost:5173/u/${invitation.slug}?to=${guest.code}`)
    expect(guest.share_text).toContain('Kepada Yth. Budi Santoso,')
    expect(guest.share_text).toContain(guest.personal_url)
    expect(guest.share_text).toEndWith('Raka & Sinta')
    expect(guest.share_text).not.toContain('—')
  })

  it('answers 402 once the free quota of 50 is used', async () => {
    const { user, token } = await createUser()
    const invitation = await createInvitation(user.id)
    await seedGuests(invitation.id, 50)
    const res = await api.post(guestsUrl(invitation.id), { token, body: { name: 'Tamu 51' } })
    expect(res.status).toBe(402)
    expect(res.json.error.details).toMatchObject({
      limit: 50,
      remaining: 0,
      required_plan: 'basic',
    })
  })

  it("answers 403 on someone else's invitation", async () => {
    const owner = await createUser()
    const stranger = await createUser()
    const invitation = await createInvitation(owner.user.id)
    const res = await api.post(guestsUrl(invitation.id), {
      token: stranger.token,
      body: { name: 'Budi' },
    })
    expect(res.status).toBe(403)
  })
})

describe('GET /invitations/:id/guests', () => {
  it('searches, filters, sorts and paginates', async () => {
    const { user, token } = await createUser()
    const invitation = await createInvitation(user.id)
    await GuestModel.insertMany([
      { invitation_id: invitation._id, name: 'Budi', code: 'AAAAAAA1', group: 'keluarga' },
      { invitation_id: invitation._id, name: 'Bunga', code: 'AAAAAAA2', group: 'teman' },
      {
        invitation_id: invitation._id,
        name: 'Citra',
        code: 'AAAAAAA3',
        group: 'keluarga',
        opened_at: new Date(),
      },
    ])
    const url = guestsUrl(invitation.id)

    const search = await api.get(`${url}?q=bu&sort=name`, { token })
    expect(search.json.data.map((g: { name: string }) => g.name)).toEqual(['Budi', 'Bunga'])

    const family = await api.get(`${url}?group=keluarga&sort=-name`, { token })
    expect(family.json.data.map((g: { name: string }) => g.name)).toEqual(['Citra', 'Budi'])

    const opened = await api.get(`${url}?opened=true`, { token })
    expect(opened.json.data.map((g: { name: string }) => g.name)).toEqual(['Citra'])
    const unopened = await api.get(`${url}?opened=false`, { token })
    expect(unopened.json.meta.total).toBe(2)

    const page = await api.get(`${url}?limit=1&page=3&sort=name`, { token })
    expect(page.json.data[0].name).toBe('Citra')
    expect(page.json.meta).toEqual({ page: 3, limit: 1, total: 3, total_pages: 3 })
  })

  it('treats regex characters in q as plain text', async () => {
    const { user, token } = await createUser()
    const invitation = await createInvitation(user.id)
    await seedGuests(invitation.id, 2)
    const res = await api.get(`${guestsUrl(invitation.id)}?q=.*`, { token })
    expect(res.status).toBe(200)
    expect(res.json.data).toHaveLength(0)
  })
})

describe('PUT and DELETE /invitations/:id/guests/:guestId', () => {
  it('updates and deletes a guest, then answers 404', async () => {
    const { user, token } = await createUser()
    const invitation = await createInvitation(user.id)
    const created = await api.post(guestsUrl(invitation.id), { token, body: { name: 'Budi' } })
    const url = `${guestsUrl(invitation.id)}/${created.json.data.id}`

    const updated = await api.put(url, { token, body: { pax_quota: 4, group: 'keluarga' } })
    expect(updated.status).toBe(200)
    expect(updated.json.data).toMatchObject({ name: 'Budi', pax_quota: 4, group: 'keluarga' })

    expect((await api.delete(url, { token })).status).toBe(200)
    expect((await api.delete(url, { token })).status).toBe(404)
    expect((await api.put(url, { token, body: { name: 'X' } })).status).toBe(404)
  })

  it("cannot reach a guest through another invitation's id", async () => {
    const { user, token } = await createUser()
    const mine = await createInvitation(user.id)
    const other = await createInvitation(user.id)
    const created = await api.post(guestsUrl(other.id), { token, body: { name: 'Budi' } })
    const res = await api.delete(`${guestsUrl(mine.id)}/${created.json.data.id}`, { token })
    expect(res.status).toBe(404)
  })
})

describe('POST /invitations/:id/guests/import', () => {
  it('imports a CSV on the premium plan', async () => {
    const { user, token } = await createUser()
    const invitation = await createInvitation(user.id, { plan: 'premium' })
    const csv = '﻿Name,Phone,Group,Pax_Quota\nBudi,08123456789,keluarga,3\nCitra,,teman,\n'
    const res = await api.post(`${guestsUrl(invitation.id)}/import`, { token, body: csvForm(csv) })
    expect(res.status).toBe(201)
    expect(res.json.data.imported).toBe(2)
    const citra = res.json.data.guests.find((g: { name: string }) => g.name === 'Citra')
    expect(citra).toMatchObject({ phone: null, group: 'teman', pax_quota: 2 })
    const codes = res.json.data.guests.map((g: { code: string }) => g.code)
    expect(new Set(codes).size).toBe(2)
  })

  it('rejects the whole file and names the bad rows', async () => {
    const { user, token } = await createUser()
    const invitation = await createInvitation(user.id, { plan: 'premium' })
    const csv = 'name,pax_quota\nBudi,2\n,1\nCitra,banyak\n'
    const res = await api.post(`${guestsUrl(invitation.id)}/import`, { token, body: csvForm(csv) })
    expect(res.status).toBe(400)
    expect(res.json.error.details.rows.map((r: { row: number }) => r.row)).toEqual([3, 4])
    expect(await GuestModel.countDocuments()).toBe(0)
  })

  it('rejects a CSV without a name column', async () => {
    const { user, token } = await createUser()
    const invitation = await createInvitation(user.id, { plan: 'premium' })
    const res = await api.post(`${guestsUrl(invitation.id)}/import`, {
      token,
      body: csvForm('nama,telepon\nBudi,0812\n'),
    })
    expect(res.status).toBe(400)
  })

  it('answers 402 below premium and when the file exceeds the quota', async () => {
    const { user, token } = await createUser()
    const basic = await createInvitation(user.id, { plan: 'basic' })
    const notPremium = await api.post(`${guestsUrl(basic.id)}/import`, {
      token,
      body: csvForm('name\nBudi\n'),
    })
    expect(notPremium.status).toBe(402)

    const premium = await createInvitation(user.id, { plan: 'premium' })
    await seedGuests(premium.id, 999)
    const over = await api.post(`${guestsUrl(premium.id)}/import`, {
      token,
      body: csvForm('name\nBudi\nCitra\n'),
    })
    expect(over.status).toBe(402)
  })
})
