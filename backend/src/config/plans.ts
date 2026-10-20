import type { Tier } from '../models/theme'

export type PlanRules = {
  price: number
  themeTiers: readonly Tier[]
  watermark: boolean
  guestQuota: number
  galleryLimit: number
  music: boolean
  giftAccounts: boolean
  csvImport: boolean
  rsvpExport: boolean
  activeDays: number
}

// SRS 2.1 plan table. Prices are per invitation, paid once.
export const PLANS: Record<Tier, PlanRules> = {
  free: {
    price: 0,
    themeTiers: ['free'],
    watermark: true,
    guestQuota: 50,
    galleryLimit: 6,
    music: false,
    giftAccounts: false,
    csvImport: false,
    rsvpExport: false,
    activeDays: 30,
  },
  basic: {
    price: 49_000,
    themeTiers: ['free', 'basic'],
    watermark: false,
    guestQuota: 300,
    galleryLimit: 20,
    music: true,
    giftAccounts: true,
    csvImport: false,
    rsvpExport: false,
    activeDays: 180,
  },
  premium: {
    price: 99_000,
    themeTiers: ['free', 'basic', 'premium'],
    watermark: false,
    guestQuota: 1_000,
    galleryLimit: 50,
    music: true,
    giftAccounts: true,
    csvImport: true,
    rsvpExport: true,
    activeDays: 365,
  },
}

export const PLAN_ORDER: readonly Tier[] = ['free', 'basic', 'premium']
