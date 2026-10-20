import type { ContentfulStatusCode } from 'hono/utils/http-status'

export class AppError extends Error {
  constructor(
    readonly status: ContentfulStatusCode,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message)
  }
}

export const badRequest = (message: string, details?: unknown) =>
  new AppError(400, 'BAD_REQUEST', message, details)
export const unauthorized = (message = 'Authentication required') =>
  new AppError(401, 'UNAUTHORIZED', message)
export const paymentRequired = (message: string, details?: unknown) =>
  new AppError(402, 'PLAN_LIMIT', message, details)
export const forbidden = (message = 'You do not have access to this resource') =>
  new AppError(403, 'FORBIDDEN', message)
export const notFound = (message = 'Resource not found') => new AppError(404, 'NOT_FOUND', message)
export const conflict = (message: string) => new AppError(409, 'CONFLICT', message)
export const gone = (message: string) => new AppError(410, 'GONE', message)
export const unprocessable = (message: string, details?: unknown) =>
  new AppError(422, 'UNPROCESSABLE', message, details)
export const badGateway = (message: string) => new AppError(502, 'BAD_GATEWAY', message)
export const serviceUnavailable = (message: string) =>
  new AppError(503, 'SERVICE_UNAVAILABLE', message)
