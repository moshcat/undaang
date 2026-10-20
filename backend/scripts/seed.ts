import { connectDb, disconnectDb } from '../src/config/db'
import { env } from '../src/config/env'
import { ThemeModel, UserModel } from '../src/models'
import type { Tier } from '../src/models/theme'

// One theme per tier so every plan can be tried right after seeding. Preview images are left
// empty until the designer uploads real ones.
const STARTER_THEMES: { code: string; name: string; tier: Tier; primary_color: string }[] = [
  { code: 'rustic-sage', name: 'Rustic Sage', tier: 'free', primary_color: '#8a9a5b' },
  { code: 'classic-ivory', name: 'Classic Ivory', tier: 'basic', primary_color: '#b08d57' },
  { code: 'royal-navy', name: 'Royal Navy', tier: 'premium', primary_color: '#1f3a5f' },
]

export async function seedDatabase(admin?: { email: string; password: string }) {
  const report: string[] = []

  for (const theme of STARTER_THEMES) {
    // $setOnInsert keeps edits an admin made in the dashboard.
    const result = await ThemeModel.updateOne(
      { code: theme.code },
      {
        $setOnInsert: {
          code: theme.code,
          name: theme.name,
          tier: theme.tier,
          defaults: { primary_color: theme.primary_color, font: null },
          is_active: true,
        },
      },
      { upsert: true },
    )
    report.push(`theme ${theme.code}: ${result.upsertedCount ? 'created' : 'already there'}`)
  }

  if (admin) {
    const email = admin.email.toLowerCase()
    const existing = await UserModel.findOne({ email })
    if (existing) {
      if (existing.role !== 'admin') {
        existing.role = 'admin'
        await existing.save()
        report.push(`admin ${email}: promoted existing account`)
      } else {
        report.push(`admin ${email}: already there`)
      }
    } else {
      await UserModel.create({
        name: 'Admin undaang',
        email,
        password: await Bun.password.hash(admin.password, { algorithm: 'bcrypt', cost: 10 }),
        role: 'admin',
      })
      report.push(`admin ${email}: created`)
    }
  } else {
    report.push('admin: skipped, set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD to create one')
  }
  return report
}

if (import.meta.main) {
  const config = env()
  await connectDb(config.MONGODB_URI)
  try {
    const admin =
      config.SEED_ADMIN_EMAIL && config.SEED_ADMIN_PASSWORD
        ? { email: config.SEED_ADMIN_EMAIL, password: config.SEED_ADMIN_PASSWORD }
        : undefined
    for (const line of await seedDatabase(admin)) console.log(line)
  } finally {
    await disconnectDb()
  }
}
