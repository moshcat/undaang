import { beforeEach, describe, expect, it } from 'bun:test'
import { createApp } from '../src/app'
import { GuestModel, RsvpModel } from '../src/models'
import { client, createInvitation, createUser, resetDb } from './helpers'

const api = client(createApp())
const rsvpsUrl = (id: string) => `/api/v1/invitations/${id}/rsvps`

beforeEach(resetDb)

async function invitationWithRsvps(plan: 'free' | 'premium' = 'free') {
  const { user, token } = await createUser()
  const invitation = await createInvitation(user.id, { plan })
  const guest = await GuestModel.create({
    invitation_id: invitation._id,
    name: 'Budi',
    code: 'ABCDEFGH',
    group: 'keluarga',
  })
  const [first] = await RsvpModel.create(
    [
      {
        invitation_id: invitation._id,
        guest_id: guest._id,
        name: 'Budi',
        attendance: 'hadir',
        pax: 2,
        message: 'Selamat',
      },
      {
        invitation_id: invitation._id,
        name: 'Citra',
        attendance: 'tidak_hadir',
        pax: 0,
        message: '=HYPERLINK("x")',
      },
      {
        invitation_id: invitation._id,
        name: 'Dewi',
        attendance: 'ragu',
        pax: 1,
        message: 'spam',
        is_hidden: true,
      },
    ],
    // Saved one after another so createdAt follows the array order.
    { ordered: true },
  )
  return { invitation, token, first: first! }
}

describe('GET /invitations/:id/rsvps', () => {
  it('lists, filters by attendance and searches by name', async () => {
    const { invitation, token } = await invitationWithRsvps()
    const all = await api.get(rsvpsUrl(invitation.id), { token })
    expect(all.status).toBe(200)
    expect(all.json.meta.total).toBe(3)
    const hadir = await api.get(`${rsvpsUrl(invitation.id)}?attendance=hadir`, { token })
    expect(hadir.json.data.map((r: { name: string }) => r.name)).toEqual(['Budi'])
    const search = await api.get(`${rsvpsUrl(invitation.id)}?q=cit`, { token })
    expect(search.json.data.map((r: { name: string }) => r.name)).toEqual(['Citra'])
    const hidden = await api.get(`${rsvpsUrl(invitation.id)}?hidden=true`, { token })
    expect(hidden.json.data.map((r: { name: string }) => r.name)).toEqual(['Dewi'])
  })

  it("answers 403 for someone else's invitation", async () => {
    const { invitation } = await invitationWithRsvps()
    const stranger = await createUser()
    expect((await api.get(rsvpsUrl(invitation.id), { token: stranger.token })).status).toBe(403)
  })
})

describe('PATCH /invitations/:id/rsvps/:rsvpId', () => {
  it('hides a wish, then answers 404 for an unknown RSVP', async () => {
    const { invitation, token, first } = await invitationWithRsvps()
    const res = await api.patch(`${rsvpsUrl(invitation.id)}/${first.id}`, {
      token,
      body: { is_hidden: true },
    })
    expect(res.status).toBe(200)
    expect(res.json.data.is_hidden).toBe(true)
    const missing = await api.patch(`${rsvpsUrl(invitation.id)}/6500a1b2c3d4e5f678907890`, {
      token,
      body: { is_hidden: true },
    })
    expect(missing.status).toBe(404)
  })
})

describe('GET /invitations/:id/rsvps/export', () => {
  it('downloads a CSV on premium with formulas neutralised', async () => {
    const { invitation, token } = await invitationWithRsvps('premium')
    const res = await api.get(`${rsvpsUrl(invitation.id)}/export`, { token })
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('text/csv')
    expect(res.headers.get('content-disposition')).toContain(`rsvp-${invitation.slug}.csv`)
    const lines = res.text
      .replace(/^\uFEFF/, '')
      .trim()
      .split(/\r?\n/)
    expect(lines[0]).toBe('name,group,attendance,pax,message,hidden,submitted_at')
    expect(lines[1]).toStartWith('Budi,keluarga,hadir,2,Selamat,no,')
    expect(lines[2]).toContain(`'=HYPERLINK`)
    expect(lines).toHaveLength(4)
  })

  it('answers 402 below premium', async () => {
    const { invitation, token } = await invitationWithRsvps('free')
    expect((await api.get(`${rsvpsUrl(invitation.id)}/export`, { token })).status).toBe(402)
  })
})
