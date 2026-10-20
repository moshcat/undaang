import { afterAll } from 'bun:test'
import { MongoMemoryReplSet } from 'mongodb-memory-server'
import mongoose from 'mongoose'
import { connectDb } from '../src/config/db'
import { resetEnv } from '../src/config/env'

// A replica set, not a standalone server: payment activation runs inside a transaction.
const replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } })

Object.assign(process.env, {
  NODE_ENV: 'test',
  MONGODB_URI: replSet.getUri('undaang-test'),
  JWT_SECRET: 'test-secret-that-is-at-least-32-characters-long',
  CORS_ORIGIN: 'http://localhost:5173',
  APP_BASE_URL: 'http://localhost:5173',
  R2_ACCOUNT_ID: 'test-account',
  R2_ACCESS_KEY_ID: 'test-key',
  R2_SECRET_ACCESS_KEY: 'test-secret',
  R2_BUCKET: 'undaang-test',
  R2_PUBLIC_URL: 'https://media.test.local',
  DOKU_CLIENT_ID: 'BRN-TEST-0001',
  DOKU_SECRET_KEY: 'SK-test-secret',
  DOKU_BASE_URL: 'https://api-sandbox.doku.test',
})
resetEnv()

await connectDb(process.env.MONGODB_URI as string)

afterAll(async () => {
  await mongoose.disconnect()
  await replSet.stop()
})
