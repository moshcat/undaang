import { describe, expect, it } from 'bun:test'
import { PLANS } from '../src/config/plans'
import { AppError } from '../src/lib/errors'
import {
  assertFeature,
  assertGalleryLimit,
  assertGuestCapacity,
  assertThemeAllowed,
  extendExpiry,
  isExpired,
} from '../src/services/plan'

function thrown(fn: () => void) {
  try {
    fn()
  } catch (err) {
    return err as AppError
  }
  throw new Error('expected an error')
}

const DAY = 24 * 60 * 60 * 1000

describe('plan rules (SRS 2.1)', () => {
  it('matches the price table', () => {
    expect(PLANS.free.price).toBe(0)
    expect(PLANS.basic.price).toBe(49_000)
    expect(PLANS.premium.price).toBe(99_000)
    expect([PLANS.free.guestQuota, PLANS.basic.guestQuota, PLANS.premium.guestQuota]).toEqual([
      50, 300, 1000,
    ])
    expect([PLANS.free.galleryLimit, PLANS.basic.galleryLimit, PLANS.premium.galleryLimit]).toEqual(
      [6, 20, 50],
    )
  })

  it('blocks themes above the plan with 402 and names the plan to buy', () => {
    expect(() => assertThemeAllowed('basic', 'basic')).not.toThrow()
    const err = thrown(() => assertThemeAllowed('free', 'premium'))
    expect(err.status).toBe(402)
    expect(err.details).toEqual({ plan: 'free', required_plan: 'premium' })
  })

  it('gates music and gift accounts to basic, CSV and export to premium', () => {
    expect(thrown(() => assertFeature('free', 'music')).details).toMatchObject({
      required_plan: 'basic',
    })
    expect(() => assertFeature('basic', 'giftAccounts')).not.toThrow()
    expect(thrown(() => assertFeature('basic', 'csvImport')).details).toMatchObject({
      required_plan: 'premium',
    })
    expect(() => assertFeature('premium', 'rsvpExport')).not.toThrow()
  })

  it('enforces gallery and guest limits', () => {
    expect(() => assertGalleryLimit('free', 6)).not.toThrow()
    expect(thrown(() => assertGalleryLimit('free', 7)).details).toMatchObject({
      limit: 6,
      required_plan: 'basic',
    })
    expect(() => assertGuestCapacity('free', 49, 1)).not.toThrow()
    expect(thrown(() => assertGuestCapacity('free', 50, 1)).details).toMatchObject({
      limit: 50,
      remaining: 0,
    })
    expect(thrown(() => assertGuestCapacity('basic', 0, 1001)).details).toMatchObject({
      required_plan: null,
    })
  })

  it('extends from the later of now and the current expiry', () => {
    const now = new Date('2026-10-01T00:00:00Z')
    const ahead = new Date(now.getTime() + 10 * DAY)
    expect(extendExpiry(ahead, 'basic', now).getTime()).toBe(ahead.getTime() + 180 * DAY)
    const past = new Date(now.getTime() - 5 * DAY)
    expect(extendExpiry(past, 'premium', now).getTime()).toBe(now.getTime() + 365 * DAY)
    expect(isExpired(past, now)).toBe(true)
    expect(isExpired(ahead, now)).toBe(false)
  })
})
