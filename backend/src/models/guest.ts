import { type HydratedDocument, type InferSchemaType, Schema, model } from 'mongoose'

const guestSchema = new Schema(
  {
    invitation_id: { type: Schema.Types.ObjectId, ref: 'Invitation', required: true },
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true },
    phone: { type: String, default: null },
    group: { type: String, default: null, trim: true },
    pax_quota: { type: Number, default: 2, min: 1 },
    opened_at: { type: Date, default: null },
  },
  { timestamps: true },
)

guestSchema.index({ invitation_id: 1, code: 1 }, { unique: true })

export type Guest = InferSchemaType<typeof guestSchema>
export type GuestDoc = HydratedDocument<Guest>
export const GuestModel = model('Guest', guestSchema)
