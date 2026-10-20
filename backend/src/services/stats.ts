import { GuestModel, RsvpModel, type InvitationDoc } from '../models'
import { ATTENDANCES } from '../models/rsvp'
import type { Tier } from '../models/theme'
import { rules } from './plan'

type AttendanceRow = { _id: (typeof ATTENDANCES)[number]; count: number; pax: number }

export async function invitationStats(invitation: InvitationDoc) {
  const [guestFacets, rsvpRows, respondedRows] = await Promise.all([
    GuestModel.aggregate<{ total: { n: number }[]; opened: { n: number }[] }>([
      { $match: { invitation_id: invitation._id } },
      {
        $facet: {
          total: [{ $count: 'n' }],
          opened: [{ $match: { opened_at: { $ne: null } } }, { $count: 'n' }],
        },
      },
    ]),
    RsvpModel.aggregate<AttendanceRow>([
      { $match: { invitation_id: invitation._id } },
      { $group: { _id: '$attendance', count: { $sum: 1 }, pax: { $sum: '$pax' } } },
    ]),
    RsvpModel.aggregate<{ n: number }>([
      { $match: { invitation_id: invitation._id, guest_id: { $ne: null } } },
      { $group: { _id: '$guest_id' } },
      { $count: 'n' },
    ]),
  ])

  const totalGuests = guestFacets[0]?.total[0]?.n ?? 0
  const openedGuests = guestFacets[0]?.opened[0]?.n ?? 0
  const byAttendance = Object.fromEntries(
    ATTENDANCES.map((a) => {
      const row = rsvpRows.find((r) => r._id === a)
      return [a, { count: row?.count ?? 0, pax: row?.pax ?? 0 }]
    }),
  ) as Record<(typeof ATTENDANCES)[number], { count: number; pax: number }>
  const quota = rules(invitation.plan as Tier).guestQuota

  return {
    view_count: invitation.view_count,
    guests: {
      total: totalGuests,
      opened: openedGuests,
      not_opened: totalGuests - openedGuests,
      responded: respondedRows[0]?.n ?? 0,
      quota,
      remaining_quota: Math.max(0, quota - totalGuests),
    },
    rsvps: {
      total: ATTENDANCES.reduce((sum, a) => sum + byAttendance[a].count, 0),
      by_attendance: byAttendance,
    },
    estimated_attendance: byAttendance.hadir.pax,
  }
}
