import { createApp } from './app'
import { connectDb } from './config/db'
import { env } from './config/env'

const app = createApp()

if (import.meta.main) {
  await connectDb(env().MONGODB_URI)
  console.log(`undaang api listening on http://localhost:${env().PORT}`)
}

export default app
