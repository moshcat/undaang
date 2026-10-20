import { type HydratedDocument, type InferSchemaType, Schema, model } from 'mongoose'

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ['admin', 'user'], default: 'user', required: true },
  },
  { timestamps: true },
)

userSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret: Record<string, unknown>) => {
    delete ret._id
    delete ret.password
    return ret
  },
})

export type User = InferSchemaType<typeof userSchema>
export type UserDoc = HydratedDocument<User>
export const UserModel = model('User', userSchema)
