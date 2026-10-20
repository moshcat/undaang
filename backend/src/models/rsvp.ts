import { type HydratedDocument, type InferSchemaType, Schema, model } from 'mongoose'

export const ATTENDANCES = ['hadir', 'tidak_hadir', 'ragu'] as const

const rsvpSchema = new Schema(
  {
    invitation_id: { type: Schema.Types.ObjectId, ref: 'Invitation', required: true },
    guest_id: { type: Schema.Types.ObjectId, ref: 'Guest', default: null },
    name: { type: String, required: true, trim: true },
    attendance: { type: String, enum: ATTENDANCES, required: true },
    pax: { type: Number, default: 1, min: 0 },
    message: { type: String, default: '', maxlength: 500 },
    is_hidden: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
)

rsvpSchema.index({ invitation_id: 1, createdAt: -1 })

export type Rsvp = InferSchemaType<typeof rsvpSchema>
export type RsvpDoc = HydratedDocument<Rsvp>
export const RsvpModel = model('Rsvp', rsvpSchema)
