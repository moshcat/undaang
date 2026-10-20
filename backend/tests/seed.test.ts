import { beforeEach, describe, expect, it } from 'bun:test'
import { seedDatabase } from '../scripts/seed'
import { ThemeModel, UserModel } from '../src/models'
import { resetDb } from './helpers'

beforeEach(resetDb)

describe('seedDatabase', () => {
  it('creates one theme per tier and the admin, and is safe to run twice', async () => {
    const admin = { email: 'Admin@Undaang.test', password: 'rahasia-admin' }
    const first = await seedDatabase(admin)
    expect(first).toContain('admin admin@undaang.test: created')
    expect((await ThemeModel.find().sort({ tier: 1 })).map((t) => t.tier).sort()).toEqual([
      'basic',
      'free',
      'premium',
    ])

    await ThemeModel.updateOne({ code: 'rustic-sage' }, { name: 'Renamed by admin' })
    const second = await seedDatabase(admin)
    expect(second).toContain('admin admin@undaang.test: already there')
    expect(await ThemeModel.countDocuments()).toBe(3)
    expect((await ThemeModel.findOne({ code: 'rustic-sage' }))!.name).toBe('Renamed by admin')

    const stored = await UserModel.findOne({ email: 'admin@undaang.test' }).select('+password')
    expect(stored!.role).toBe('admin')
    expect(await Bun.password.verify('rahasia-admin', stored!.password)).toBe(true)
  })

  it('promotes an existing account and skips the admin when no credentials are given', async () => {
    await UserModel.create({ name: 'Abi', email: 'abi@mail.test', password: 'hash' })
    expect(await seedDatabase({ email: 'abi@mail.test', password: 'whatever1' })).toContain(
      'admin abi@mail.test: promoted existing account',
    )
    expect((await UserModel.findOne({ email: 'abi@mail.test' }))!.role).toBe('admin')
    const report = await seedDatabase()
    expect(report.at(-1)).toStartWith('admin: skipped')
  })
})
