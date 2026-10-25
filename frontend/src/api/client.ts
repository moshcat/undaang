import createClient from 'openapi-fetch'
import type { paths } from './schema'
import { ApiError } from './errors'

const TOKEN_KEY = 'undaang.token'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

let unauthorizedHandler: (() => void) | undefined

/** Called once from main.ts so a 401 can log out and redirect without importing the router here. */
export function onUnauthorized(handler: () => void) {
  unauthorizedHandler = handler
}

/**
 * The only HTTP client for the backend. Paths and bodies are typed from `schema.d.ts`,
 * which is generated from the backend's /openapi.json (`bun run gen:api`).
 */
export const api = createClient<paths>({
  // Empty in dev: Vite proxies /api to the backend (vite.config.ts).
  baseUrl: import.meta.env.VITE_API_BASE_URL ?? '',
})

api.use({
  onRequest({ request }) {
    const token = getToken()
    if (token) request.headers.set('Authorization', `Bearer ${token}`)
    return request
  },
  onResponse({ response }) {
    if (response.status === 401 && getToken()) unauthorizedHandler?.()
    return response
  },
})

type Result<T> = { data?: T; error?: unknown; response: Response }

/**
 * Await an `api.*` call and get the success body (`{ data, meta? }`), or throw `ApiError`.
 *
 *   const { data } = await unwrap(api.GET('/api/v1/auth/me'))
 */
export async function unwrap<T>(call: Promise<Result<T>>): Promise<T> {
  const { data, error, response } = await call
  if (!response.ok || data === undefined) throw ApiError.from(response.status, error)
  return data
}
