import { beforeEach, describe, expect, it } from 'bun:test'
import { createApp } from '../src/app'
import { GuestModel, RsvpModel } from '../src/models'
import { client, createInvitation, createUser, resetDb } from './helpers'

const api = client(createApp())

beforeEach(resetDb)

describe('GET /invitations/:id/stats', () => {
  it('summarises visits, opened links and RSVPs', async () => {
    const { user, token } = await createUser()
    const invitation = await createInvitation(user.id)
    invitation.view_count = 42
    await invitation.save()
    const other = await createInvitation(user.id)
    const [budi, citra] = await GuestModel.create([
      { invitation_id: invitation._id, name: 'Budi', code: 'AAAAAAA1', opened_at: new Date() },
      { invitation_id: invitation._id, name: 'Citra', code: 'AAAAAAA2', opened_at: new Date() },
      { invitation_id: invitation._id, name: 'Dewi', code: 'AAAAAAA3' },
      { invitation_id: other._id, name: 'Lain', code: 'AAAAAAA4', opened_at: new Date() },
    ])
    await RsvpModel.create([
      {
        invitation_id: invitation._id,
        guest_id: budi!._id,
        name: 'Budi',
        attendance: 'hadir',
        pax: 2,
      },
      {
        invitation_id: invitation._id,
        guest_id: citra!._id,
        name: 'Citra',
        attendance: 'ragu',
        pax: 1,
      },
      { invitation_id: invitation._id, name: 'Eko', attendance: 'hadir', pax: 3 },
      { invitation_id: invitation._id, name: 'Fani', attendance: 'tidak_hadir', pax: 0 },
      { invitation_id: other._id, name: 'Lain', attendance: 'hadir', pax: 5 },
    ])

    const res = await api.get(`/api/v1/invitations/${invitation.id}/stats`, { token })
    expect(res.status).toBe(200)
    expect(res.json.data).toEqual({
      view_count: 42,
      guests: { total: 3, opened: 2, not_opened: 1, responded: 2, quota: 50, remaining_quota: 47 },
      rsvps: {
        total: 4,
        by_attendance: {
          hadir: { count: 2, pax: 5 },
          tidak_hadir: { count: 1, pax: 0 },
          ragu: { count: 1, pax: 1 },
        },
      },
      estimated_attendance: 5,
    })
  })

  it('returns zeros for an empty invitation and 403 for strangers', async () => {
    const { user, token } = await createUser()
    const invitation = await createInvitation(user.id)
    const res = await api.get(`/api/v1/invitations/${invitation.id}/stats`, { token })
    expect(res.json.data.guests.total).toBe(0)
    expect(res.json.data.rsvps.by_attendance.hadir).toEqual({ count: 0, pax: 0 })
    const stranger = await createUser()
    const denied = await api.get(`/api/v1/invitations/${invitation.id}/stats`, {
      token: stranger.token,
    })
    expect(denied.status).toBe(403)
  })
})
