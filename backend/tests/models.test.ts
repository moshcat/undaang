import { beforeAll, describe, expect, it } from 'bun:test'
import {
  GuestModel,
  InvitationModel,
  OrderModel,
  RsvpModel,
  ThemeModel,
  UserModel,
} from '../src/models'
import { resetDb } from './helpers'

async function indexKeys(model: {
  collection: { indexes(): Promise<{ key: object; unique?: boolean }[]> }
}) {
  const indexes = await model.collection.indexes()
  return indexes.map((i) => ({ key: i.key, unique: Boolean(i.unique) }))
}

describe('model indexes (SDS 3.2)', () => {
  beforeAll(resetDb)

  it('creates the unique and lookup indexes', async () => {
    expect(await indexKeys(UserModel)).toContainEqual({ key: { email: 1 }, unique: true })
    expect(await indexKeys(ThemeModel)).toContainEqual({ key: { code: 1 }, unique: true })
    expect(await indexKeys(InvitationModel)).toContainEqual({ key: { slug: 1 }, unique: true })
    expect(await indexKeys(InvitationModel)).toContainEqual({ key: { owner_id: 1 }, unique: false })
    expect(await indexKeys(GuestModel)).toContainEqual({
      key: { invitation_id: 1, code: 1 },
      unique: true,
    })
    expect(await indexKeys(RsvpModel)).toContainEqual({
      key: { invitation_id: 1, createdAt: -1 },
      unique: false,
    })
    expect(await indexKeys(OrderModel)).toContainEqual({ key: { invoice_number: 1 }, unique: true })
  })

  it('never serializes the password hash', async () => {
    const user = await UserModel.create({ name: 'Raka', email: 'RAKA@mail.test', password: 'hash' })
    const json = user.toJSON() as Record<string, unknown>
    expect(json.password).toBeUndefined()
    expect(json.email).toBe('raka@mail.test')
    expect(typeof json.id).toBe('string')
  })
})
