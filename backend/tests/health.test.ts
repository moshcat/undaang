import { describe, expect, it } from 'bun:test'
import { createApp } from '../src/app'
import { client } from './helpers'

const api = client(createApp())

describe('core', () => {
  it('reports health with the database connected', async () => {
    const res = await api.get('/health')
    expect(res.status).toBe(200)
    expect(res.json).toEqual({ data: { status: 'ok', db: 'up' } })
  })

  it('returns a JSON 404 for unknown routes', async () => {
    const res = await api.get('/api/v1/nope')
    expect(res.status).toBe(404)
    expect(res.json.error.code).toBe('NOT_FOUND')
  })

  it('serves the OpenAPI document', async () => {
    const res = await api.get('/openapi.json')
    expect(res.status).toBe(200)
    expect(res.json.info.title).toBe('undaang API')
  })
})
