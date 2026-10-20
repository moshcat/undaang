import Papa from 'papaparse'
import { env } from '../config/env'
import { guestCode } from '../lib/code'
import { badRequest, conflict } from '../lib/errors'
import { GuestModel, type GuestDoc, type InvitationDoc } from '../models'
import type { Tier } from '../models/theme'
import { csvRow } from '../schemas/guest'
import { assertGuestCapacity } from './plan'

type NewGuest = { name: string; phone?: string | null; group?: string | null; pax_quota?: number }

export function personalUrl(invitation: InvitationDoc, code: string) {
  return `${env().APP_BASE_URL.replace(/\/$/, '')}/u/${invitation.slug}?to=${code}`
}

function coupleNames(invitation: InvitationDoc) {
  const groom = invitation.couple?.groom
  const bride = invitation.couple?.bride
  return [groom?.nickname || groom?.name, bride?.nickname || bride?.name]
    .filter(Boolean)
    .join(' & ')
}

export function shareText(invitation: InvitationDoc, guestName: string, url: string) {
  return [
    `Kepada Yth. ${guestName},`,
    '',
    'Tanpa mengurangi rasa hormat, kami mengundang Bapak/Ibu/Saudara/i untuk hadir di acara pernikahan kami.',
    '',
    'Detail acara dan konfirmasi kehadiran:',
    url,
    '',
    'Merupakan suatu kehormatan bagi kami apabila Bapak/Ibu/Saudara/i berkenan hadir dan memberikan doa restu.',
    '',
    'Terima kasih.',
    coupleNames(invitation),
  ].join('\n')
}

export function serializeGuest(invitation: InvitationDoc, guest: GuestDoc) {
  const url = personalUrl(invitation, guest.code)
  return {
    ...guest.toJSON(),
    personal_url: url,
    share_text: shareText(invitation, guest.name, url),
  }
}

async function uniqueCodes(invitation: InvitationDoc, count: number) {
  const taken = new Set(
    (await GuestModel.find({ invitation_id: invitation._id }, { code: 1 })).map((g) => g.code),
  )
  const codes: string[] = []
  while (codes.length < count) {
    const code = guestCode()
    if (!taken.has(code)) {
      taken.add(code)
      codes.push(code)
    }
  }
  return codes
}

export async function addGuests(
  invitation: InvitationDoc,
  guests: NewGuest[],
): Promise<GuestDoc[]> {
  const current = await GuestModel.countDocuments({ invitation_id: invitation._id })
  assertGuestCapacity(invitation.plan as Tier, current, guests.length)
  const codes = await uniqueCodes(invitation, guests.length)
  try {
    const docs = guests.map(
      (g, i) => new GuestModel({ ...g, invitation_id: invitation._id, code: codes[i] }),
    )
    return await GuestModel.insertMany(docs)
  } catch (err) {
    if ((err as { code?: number }).code === 11000) {
      throw conflict('Another request added guests at the same time, try again')
    }
    throw err
  }
}

export function parseGuestCsv(text: string) {
  const parsed = Papa.parse<Record<string, string>>(text.replace(/^\uFEFF/, ''), {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (h) => h.trim().toLowerCase(),
  })
  if (!parsed.meta.fields?.includes('name')) {
    throw badRequest('The CSV needs a header row with at least a "name" column', {
      expected_columns: ['name', 'phone', 'group', 'pax_quota'],
    })
  }
  if (parsed.data.length === 0) throw badRequest('The CSV has no guest rows')

  const rows: NewGuest[] = []
  const problems: { row: number; path: string; message: string }[] = []
  parsed.data.forEach((raw, index) => {
    const result = csvRow.safeParse({
      name: raw.name ?? '',
      phone: raw.phone ?? '',
      group: raw.group ?? '',
      pax_quota: raw.pax_quota ?? '',
    })
    // Row 1 is the header, so the first guest is row 2 as seen in a spreadsheet.
    if (result.success) rows.push(result.data)
    else {
      for (const issue of result.error.issues) {
        problems.push({ row: index + 2, path: issue.path.join('.'), message: issue.message })
      }
    }
  })
  if (problems.length > 0) throw badRequest('Some CSV rows are invalid', { rows: problems })
  return rows
}
