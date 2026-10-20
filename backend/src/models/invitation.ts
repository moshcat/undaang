import { type HydratedDocument, type InferSchemaType, Schema, model } from 'mongoose'
import { TIERS } from './theme'

export const INVITATION_STATUSES = ['draft', 'published', 'suspended'] as const
export const EVENT_TYPES = ['akad', 'pemberkatan', 'resepsi'] as const

const personSchema = new Schema(
  {
    name: { type: String, default: '' },
    nickname: { type: String, default: '' },
    parents: { type: String, default: '' },
    photo_url: { type: String, default: null },
  },
  { _id: false },
)

const eventSchema = new Schema({
  type: { type: String, enum: EVENT_TYPES, required: true },
  start_at: { type: Date, required: true },
  end_at: { type: Date, default: null },
  venue: { type: String, required: true },
  address: { type: String, default: '' },
  maps_url: { type: String, default: null },
})

const invitationSchema = new Schema(
  {
    owner_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    theme_id: { type: Schema.Types.ObjectId, ref: 'Theme', required: true },
    status: { type: String, enum: INVITATION_STATUSES, default: 'draft', required: true },
    plan: { type: String, enum: TIERS, default: 'free', required: true },
    plan_expires_at: { type: Date, required: true },
    couple: {
      groom: { type: personSchema, default: () => ({}) },
      bride: { type: personSchema, default: () => ({}) },
    },
    events: { type: [eventSchema], default: [] },
    gallery: {
      type: [
        new Schema(
          {
            url: { type: String, required: true },
            caption: { type: String, default: '' },
            order: { type: Number, default: 0 },
          },
          { _id: false },
        ),
      ],
      default: [],
    },
    stories: {
      type: [
        new Schema(
          {
            date: { type: Date, default: null },
            title: { type: String, required: true },
            body: { type: String, default: '' },
          },
          { _id: false },
        ),
      ],
      default: [],
    },
    gift_accounts: {
      type: [
        new Schema(
          {
            bank: { type: String, required: true },
            account_no: { type: String, required: true },
            account_name: { type: String, required: true },
          },
          { _id: false },
        ),
      ],
      default: [],
    },
    settings: {
      primary_color: { type: String, default: null },
      music_url: { type: String, default: null },
      show_wishes: { type: Boolean, default: true },
    },
    view_count: { type: Number, default: 0 },
  },
  { timestamps: true },
)

export type Invitation = InferSchemaType<typeof invitationSchema>
export type InvitationDoc = HydratedDocument<Invitation>
export const InvitationModel = model('Invitation', invitationSchema)
