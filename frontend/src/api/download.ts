import { api } from './client'
import { ApiError } from './errors'

/** Download the RSVP CSV (Premium). The filename is set here because CORS hides Content-Disposition. */
export async function downloadRsvpCsv(invitationId: string, filename: string) {
  const { data, error, response } = await api.GET('/api/v1/invitations/{id}/rsvps/export', {
    params: { path: { id: invitationId } },
    parseAs: 'blob',
  })
  if (!response.ok || !data) throw ApiError.from(response.status, error)
  const url = URL.createObjectURL(data as Blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
