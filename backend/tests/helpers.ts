import mongoose from 'mongoose'
import { createApp } from '../src/app'

export type TestApp = ReturnType<typeof createApp>

export async function resetDb() {
  // Unique indexes must exist before tests that rely on duplicate-key errors.
  await Promise.all(Object.values(mongoose.models).map((m) => m.init()))
  const collections = await mongoose.connection.db!.collections()
  await Promise.all(collections.map((c) => c.deleteMany({})))
}

type RequestOptions = {
  token?: string
  body?: unknown
  headers?: Record<string, string>
}

export function client(app: TestApp) {
  const send = async (method: string, path: string, options: RequestOptions = {}) => {
    const headers: Record<string, string> = { ...options.headers }
    if (options.token) headers.Authorization = `Bearer ${options.token}`
    let body: BodyInit | undefined
    if (options.body instanceof FormData || typeof options.body === 'string') {
      body = options.body
    } else if (options.body !== undefined) {
      headers['Content-Type'] = 'application/json'
      body = JSON.stringify(options.body)
    }
    const res = await app.request(path, { method, headers, body })
    const text = await res.text()
    let json: any
    try {
      json = text ? JSON.parse(text) : undefined
    } catch {
      json = undefined
    }
    return { status: res.status, headers: res.headers, json, text }
  }
  return {
    get: (path: string, o?: RequestOptions) => send('GET', path, o),
    post: (path: string, o?: RequestOptions) => send('POST', path, o),
    put: (path: string, o?: RequestOptions) => send('PUT', path, o),
    patch: (path: string, o?: RequestOptions) => send('PATCH', path, o),
    delete: (path: string, o?: RequestOptions) => send('DELETE', path, o),
  }
}
