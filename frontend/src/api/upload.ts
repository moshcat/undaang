import { api, unwrap } from './client'
import { ApiError } from './errors'
import type { PresignBody } from './types'

/**
 * Upload a photo or song straight to R2 and return its public URL.
 * The URL is not saved anywhere yet: put it into the invitation with PUT /invitations/:id.
 */
export async function uploadFile(
  invitationId: string,
  kind: PresignBody['kind'],
  file: File,
): Promise<string> {
  const { data } = await unwrap(
    api.POST('/api/v1/uploads/presign', {
      body: {
        invitation_id: invitationId,
        kind,
        content_type: file.type,
        size: file.size,
      },
    }),
  )
  // Direct PUT to R2, not the backend: no Authorization header, same Content-Type as signed.
  const res = await fetch(data.upload_url, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file,
  })
  if (!res.ok) throw new ApiError(res.status, 'BAD_GATEWAY', 'Upload to storage failed')
  return data.public_url
}

/** Import guests from a CSV file (Premium). Rejected rows come back as a 400 with `details.rows`. */
export async function importGuestsCsv(invitationId: string, file: File) {
  const { data } = await unwrap(
    api.POST('/api/v1/invitations/{id}/guests/import', {
      params: { path: { id: invitationId } },
      // The schema types `file` as a string (OpenAPI "binary"); the real body is the FormData below.
      body: { file: file.name },
      bodySerializer: () => {
        const form = new FormData()
        form.append('file', file)
        return form
      },
    }),
  )
  return data
}
