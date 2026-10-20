import { type HydratedDocument, type InferSchemaType, Schema, model } from 'mongoose'

export const TIERS = ['free', 'basic', 'premium'] as const
export type Tier = (typeof TIERS)[number]

const themeSchema = new Schema(
  {
    code: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    tier: { type: String, enum: TIERS, required: true },
    preview_url: { type: String, default: null },
    defaults: {
      primary_color: { type: String, default: '#000000' },
      font: { type: String, default: null },
    },
    is_active: { type: Boolean, default: true },
  },
  { timestamps: true },
)

export type Theme = InferSchemaType<typeof themeSchema>
export type ThemeDoc = HydratedDocument<Theme>
export const ThemeModel = model('Theme', themeSchema)
