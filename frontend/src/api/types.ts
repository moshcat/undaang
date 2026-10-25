import type { components, paths } from './schema'

/**
 * Response and body types, all derived from the generated schema.
 * Never hand-write a type for backend data; add an alias here instead.
 */
type Schemas = components['schemas']

export type User = Schemas['User']
export type Theme = Schemas['Theme']
export type Invitation = Schemas['Invitation']
export type Guest = Schemas['Guest']
export type Rsvp = Schemas['Rsvp']
export type InvitationStats = Schemas['InvitationStats']
export type Order = Schemas['Order']
export type PublicRsvp = Schemas['PublicRsvp']

export type RegisterBody = Schemas['RegisterBody']
export type LoginBody = Schemas['LoginBody']
export type CreateInvitationBody = Schemas['CreateInvitationBody']
export type UpdateInvitationBody = Schemas['UpdateInvitationBody']
export type GuestBody = Schemas['GuestBody']
export type GuestUpdateBody = Schemas['GuestUpdateBody']
export type PublicRsvpBody = Schemas['PublicRsvpBody']
export type OrderBody = Schemas['OrderBody']
export type ThemeBody = Schemas['ThemeBody']
export type PresignBody = Schemas['PresignBody']

export type Plan = Invitation['plan']
export type InvitationStatus = Invitation['status']
export type Attendance = Rsvp['attendance']
export type OrderStatus = Order['status']

/** `data` of a GET endpoint's 200 response. */
type GetData<P extends keyof paths> = paths[P] extends {
  get: { responses: { 200: { content: { 'application/json': { data: infer D } } } } }
}
  ? D
  : never

export type PublicInvitation = GetData<'/api/v1/public/invitations/{slug}'>
export type AdminStats = GetData<'/api/v1/admin/stats'>
export type AdminOrder = GetData<'/api/v1/admin/orders'>[number]
export type Session = NonNullable<
  paths['/api/v1/auth/login']['post']['responses'][200]['content']['application/json']['data']
>

/** `meta` on every paginated list. */
export type PageMeta = { page: number; limit: number; total: number; total_pages: number }
