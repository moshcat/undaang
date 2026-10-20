import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { createApp } from '../src/app'
import { resetEnv } from '../src/config/env'
import { client, createInvitation, createUser, resetDb } from './helpers'

const api = client(createApp())
const url = '/api/v1/uploads/presign'

beforeEach(resetDb)

describe('POST /api/v1/uploads/presign', () => {
  it('returns a presigned PUT URL under the invitation folder', async () => {
    const { user, token } = await createUser()
    const invitation = await createInvitation(user.id)
    const res = await api.post(url, {
      token,
      body: {
        invitation_id: invitation.id,
        kind: 'gallery',
        content_type: 'image/jpeg',
        size: 200_000,
      },
    })
    expect(res.status).toBe(200)
    const { upload_url, public_url, method } = res.json.data
    expect(method).toBe('PUT')
    expect(upload_url).toContain('X-Amz-Signature=')
    expect(upload_url).toContain(`invitations/${invitation.id}/gallery/`)
    expect(public_url).toStartWith(`https://media.test.local/invitations/${invitation.id}/gallery/`)
    expect(public_url).toEndWith('.jpg')
  })

  it('binds Content-Type and Content-Length to the signature', async () => {
    const { user, token } = await createUser()
    const invitation = await createInvitation(user.id)
    const res = await api.post(url, {
      token,
      body: {
        invitation_id: invitation.id,
        kind: 'gallery',
        content_type: 'image/webp',
        size: 12_345,
      },
    })
    const signed = new URL(res.json.data.upload_url).searchParams.get('X-Amz-SignedHeaders')
    expect(signed?.split(';')).toEqual(expect.arrayContaining(['content-length', 'content-type']))
    expect(res.json.data.headers).toEqual({ 'Content-Type': 'image/webp' })
  })

  it('rejects the wrong file type or an oversized file with 400', async () => {
    const { user, token } = await createUser()
    const invitation = await createInvitation(user.id)
    const base = { invitation_id: invitation.id, kind: 'gallery' }
    const pdf = await api.post(url, {
      token,
      body: { ...base, content_type: 'application/pdf', size: 1000 },
    })
    const huge = await api.post(url, {
      token,
      body: { ...base, content_type: 'image/png', size: 6 * 1024 * 1024 },
    })
    expect(pdf.status).toBe(400)
    expect(huge.status).toBe(400)
  })

  it('answers 402 when the gallery is full or music is not in the plan', async () => {
    const { user, token } = await createUser()
    const invitation = await createInvitation(user.id)
    invitation.set(
      'gallery',
      Array.from({ length: 6 }, (_, i) => ({ url: `https://media.test.local/${i}.jpg` })),
    )
    await invitation.save()
    const photo = await api.post(url, {
      token,
      body: {
        invitation_id: invitation.id,
        kind: 'gallery',
        content_type: 'image/jpeg',
        size: 1000,
      },
    })
    const song = await api.post(url, {
      token,
      body: { invitation_id: invitation.id, kind: 'music', content_type: 'audio/mpeg', size: 1000 },
    })
    const couplePhoto = await api.post(url, {
      token,
      body: {
        invitation_id: invitation.id,
        kind: 'couple',
        content_type: 'image/jpeg',
        size: 1000,
      },
    })
    expect(photo.status).toBe(402)
    expect(song.status).toBe(402)
    expect(couplePhoto.status).toBe(200)
  })

  it("answers 403 for someone else's invitation", async () => {
    const owner = await createUser()
    const stranger = await createUser()
    const invitation = await createInvitation(owner.user.id)
    const res = await api.post(url, {
      token: stranger.token,
      body: {
        invitation_id: invitation.id,
        kind: 'couple',
        content_type: 'image/jpeg',
        size: 1000,
      },
    })
    expect(res.status).toBe(403)
  })

  describe('without R2 credentials', () => {
    let saved: string | undefined
    beforeEach(() => {
      saved = process.env.R2_BUCKET
      process.env.R2_BUCKET = ''
      resetEnv()
    })
    afterEach(() => {
      process.env.R2_BUCKET = saved
      resetEnv()
    })

    it('answers 503', async () => {
      const { user, token } = await createUser()
      const invitation = await createInvitation(user.id)
      const res = await api.post(url, {
        token,
        body: {
          invitation_id: invitation.id,
          kind: 'couple',
          content_type: 'image/jpeg',
          size: 1000,
        },
      })
      expect(res.status).toBe(503)
    })
  })
})
