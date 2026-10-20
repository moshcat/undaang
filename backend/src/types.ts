export type Role = 'admin' | 'user'

export type AuthUser = {
  id: string
  role: Role
}

export type AppEnv = {
  Variables: {
    user: AuthUser
  }
}
