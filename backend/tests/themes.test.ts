import { beforeEach, describe, expect, it } from 'bun:test'
import { createApp } from '../src/app'
import { ThemeModel } from '../src/models'
import { client, createUser, resetDb } from './helpers'

const api = client(createApp())

beforeEach(resetDb)

describe('GET /api/v1/themes', () => {
  beforeEach(async () => {
    await ThemeModel.create([
      { code: 'rustic-sage', name: 'Rustic Sage', tier: 'free' },
      { code: 'royal-gold', name: 'Royal Gold', tier: 'premium' },
      { code: 'old-paper', name: 'Old Paper', tier: 'basic', is_active: false },
    ])
  })

  it('lists only active themes without login', async () => {
    const res = await api.get('/api/v1/themes')
    expect(res.status).toBe(200)
    expect(res.json.data.map((t: { code: string }) => t.code).sort()).toEqual([
      'royal-gold',
      'rustic-sage',
    ])
  })

  it('filters by tier', async () => {
    const res = await api.get('/api/v1/themes?tier=premium')
    expect(res.json.data).toHaveLength(1)
    expect(res.json.data[0].code).toBe('royal-gold')
  })

  it('rejects an unknown tier', async () => {
    expect((await api.get('/api/v1/themes?tier=gold')).status).toBe(400)
  })
})

describe('admin theme management', () => {
  const body = { code: 'Rustic-Sage', name: 'Rustic Sage', tier: 'free' }

  it('lets an admin create and update a theme', async () => {
    const { token } = await createUser({ role: 'admin' })
    const created = await api.post('/api/v1/admin/themes', { token, body })
    expect(created.status).toBe(201)
    expect(created.json.data.code).toBe('rustic-sage')

    const updated = await api.put(`/api/v1/admin/themes/${created.json.data.id}`, {
      token,
      body: { tier: 'basic', defaults: { primary_color: '#8a9a5b' } },
    })
    expect(updated.status).toBe(200)
    expect(updated.json.data.tier).toBe('basic')
    expect(updated.json.data.defaults.primary_color).toBe('#8a9a5b')
  })

  it('rejects a duplicate code with 409', async () => {
    const { token } = await createUser({ role: 'admin' })
    await api.post('/api/v1/admin/themes', { token, body })
    expect((await api.post('/api/v1/admin/themes', { token, body })).status).toBe(409)
  })

  it('answers 404 for an unknown theme', async () => {
    const { token } = await createUser({ role: 'admin' })
    const res = await api.put('/api/v1/admin/themes/6500a1b2c3d4e5f678902345', {
      token,
      body: { name: 'X' },
    })
    expect(res.status).toBe(404)
  })

  it('forbids regular users with 403', async () => {
    const { token } = await createUser()
    expect((await api.post('/api/v1/admin/themes', { token, body })).status).toBe(403)
  })
})
