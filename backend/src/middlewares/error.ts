import type { ErrorHandler, NotFoundHandler } from 'hono'
import { HTTPException } from 'hono/http-exception'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import mongoose from 'mongoose'
import { AppError } from '../lib/errors'
import type { AppEnv } from '../types'

export const onError: ErrorHandler<AppEnv> = (err, c) => {
  if (err instanceof AppError) {
    return c.json(
      { error: { code: err.code, message: err.message, details: err.details } },
      err.status,
    )
  }
  if (err instanceof HTTPException) {
    const status = err.status as ContentfulStatusCode
    const code = status === 401 ? 'UNAUTHORIZED' : 'HTTP_ERROR'
    return c.json({ error: { code, message: err.message } }, status)
  }
  if ((err as { code?: number }).code === 11000) {
    return c.json({ error: { code: 'CONFLICT', message: 'Resource already exists' } }, 409)
  }
  if (err instanceof mongoose.Error.CastError) {
    return c.json({ error: { code: 'BAD_REQUEST', message: `Invalid value for ${err.path}` } }, 400)
  }
  if (err instanceof mongoose.Error.ValidationError) {
    const details = Object.values(err.errors).map((e) => ({ path: e.path, message: e.message }))
    return c.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Request validation failed', details } },
      400,
    )
  }
  console.error(err)
  return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } }, 500)
}

export const onNotFound: NotFoundHandler<AppEnv> = (c) =>
  c.json({ error: { code: 'NOT_FOUND', message: `Route ${c.req.method} ${c.req.path} not found` } }, 404)
