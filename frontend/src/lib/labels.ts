import type { BadgeVariants } from '@/components/ui/badge'
import type { Attendance, InvitationStatus, OrderStatus, Plan } from '@/api/types'

/**
 * Indonesian labels and Badge variants for backend enums. Display only:
 * what a plan allows comes from `invitation.limits` and is enforced by the backend.
 */
type Label = { label: string; variant: BadgeVariants['variant'] }

export const PLAN_LABELS: Record<Plan, Label> = {
  free: { label: 'Gratis', variant: 'secondary' },
  basic: { label: 'Basic', variant: 'outline' },
  premium: { label: 'Premium', variant: 'default' },
}

export const INVITATION_STATUS_LABELS: Record<InvitationStatus, Label> = {
  draft: { label: 'Draft', variant: 'secondary' },
  published: { label: 'Terbit', variant: 'default' },
  suspended: { label: 'Ditangguhkan', variant: 'destructive' },
}

export const ATTENDANCE_LABELS: Record<Attendance, Label> = {
  hadir: { label: 'Hadir', variant: 'default' },
  tidak_hadir: { label: 'Tidak Hadir', variant: 'destructive' },
  ragu: { label: 'Ragu', variant: 'outline' },
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, Label> = {
  pending: { label: 'Menunggu', variant: 'outline' },
  paid: { label: 'Lunas', variant: 'default' },
  expired: { label: 'Kedaluwarsa', variant: 'secondary' },
  failed: { label: 'Gagal', variant: 'destructive' },
}

export const EVENT_TYPE_LABELS = {
  akad: 'Akad Nikah',
  pemberkatan: 'Pemberkatan',
  resepsi: 'Resepsi',
} as const

/** Prices shown on the landing page. The real amount is always computed by the backend. */
export const PLAN_PRICES: Record<Plan, number> = { free: 0, basic: 49_000, premium: 99_000 }
