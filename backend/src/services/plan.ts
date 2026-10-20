import { PLANS, PLAN_ORDER, type PlanRules } from '../config/plans'
import { paymentRequired } from '../lib/errors'
import type { Tier } from '../models/theme'

const DAY_MS = 24 * 60 * 60 * 1000

type Feature = 'music' | 'giftAccounts' | 'csvImport' | 'rsvpExport'

const FEATURE_LABELS: Record<Feature, string> = {
  music: 'Background music',
  giftAccounts: 'Digital gift accounts',
  csvImport: 'CSV guest import',
  rsvpExport: 'RSVP export',
}

export function rules(plan: Tier): PlanRules {
  return PLANS[plan]
}

export function planRank(plan: Tier) {
  return PLAN_ORDER.indexOf(plan)
}

function lowestPlan(test: (rules: PlanRules) => boolean): Tier | null {
  return PLAN_ORDER.find((p) => test(PLANS[p])) ?? null
}

export function canUseTheme(plan: Tier, themeTier: Tier) {
  return PLANS[plan].themeTiers.includes(themeTier)
}

export function assertThemeAllowed(plan: Tier, themeTier: Tier) {
  if (!canUseTheme(plan, themeTier)) {
    throw paymentRequired(`The ${themeTier} theme needs the ${themeTier} plan or higher`, {
      plan,
      required_plan: themeTier,
    })
  }
}

export function assertFeature(plan: Tier, feature: Feature) {
  if (!PLANS[plan][feature]) {
    throw paymentRequired(`${FEATURE_LABELS[feature]} is not included in the ${plan} plan`, {
      plan,
      required_plan: lowestPlan((r) => r[feature]),
    })
  }
}

export function assertGalleryLimit(plan: Tier, count: number) {
  const limit = PLANS[plan].galleryLimit
  if (count > limit) {
    throw paymentRequired(`The ${plan} plan allows up to ${limit} gallery photos`, {
      plan,
      limit,
      required_plan: lowestPlan((r) => r.galleryLimit >= count),
    })
  }
}

export function assertGuestCapacity(plan: Tier, current: number, adding: number) {
  const limit = PLANS[plan].guestQuota
  if (current + adding > limit) {
    throw paymentRequired(`The ${plan} plan allows up to ${limit} guests`, {
      plan,
      limit,
      remaining: Math.max(0, limit - current),
      required_plan: lowestPlan((r) => r.guestQuota >= current + adding),
    })
  }
}

export function initialExpiry(now = new Date()) {
  return new Date(now.getTime() + PLANS.free.activeDays * DAY_MS)
}

// Unused days are kept: the new period starts from the current expiry when it is still ahead.
export function extendExpiry(current: Date | null | undefined, plan: Tier, now = new Date()) {
  const start = current && current > now ? current : now
  return new Date(start.getTime() + PLANS[plan].activeDays * DAY_MS)
}

export function isExpired(expiresAt: Date | null | undefined, now = new Date()) {
  return Boolean(expiresAt && expiresAt <= now)
}
