import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { api, getToken, setToken, unwrap } from '@/api/client'
import type { LoginBody, RegisterBody, Session, User } from '@/api/types'

const EXPIRES_KEY = 'undaang.token_expires_at'

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(getToken())
  const user = ref<User | null>(null)

  const isLoggedIn = computed(() => token.value !== null)
  const isAdmin = computed(() => user.value?.role === 'admin')

  function startSession(session: Session) {
    token.value = session.token
    user.value = session.user
    setToken(session.token)
    localStorage.setItem(EXPIRES_KEY, String(Date.now() + session.expires_in * 1000))
  }

  async function login(body: LoginBody) {
    const { data } = await unwrap(api.POST('/api/v1/auth/login', { body }))
    startSession(data)
  }

  /** The backend logs the user in on register, so this also starts a session. */
  async function register(body: RegisterBody) {
    const { data } = await unwrap(api.POST('/api/v1/auth/register', { body }))
    startSession(data)
  }

  function logout() {
    token.value = null
    user.value = null
    setToken(null)
    localStorage.removeItem(EXPIRES_KEY)
  }

  /** Restore the user on page load. Drops a token that has expired (JWT lives 24 hours). */
  async function restore() {
    if (!token.value) return
    if (Number(localStorage.getItem(EXPIRES_KEY) ?? 0) < Date.now()) return logout()
    try {
      const { data } = await unwrap(api.GET('/api/v1/auth/me'))
      user.value = data
    } catch {
      logout()
    }
  }

  return { token, user, isLoggedIn, isAdmin, login, register, logout, restore }
})
