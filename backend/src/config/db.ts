import mongoose from 'mongoose'

mongoose.set('strictQuery', true)
mongoose.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret: Record<string, unknown>) => {
    delete ret._id
    return ret
  },
})

export async function connectDb(uri: string) {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10_000 })
}

export async function disconnectDb() {
  await mongoose.disconnect()
}

export function isDbUp() {
  return mongoose.connection.readyState === mongoose.ConnectionStates.connected
}
