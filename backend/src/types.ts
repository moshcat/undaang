import type { InvitationDoc } from './models/invitation'

export type Role = 'admin' | 'user'

export type AuthUser = {
  id: string
  role: Role
}

export type AppEnv = {
  Variables: {
    user: AuthUser
    invitation: InvitationDoc
  }
}
