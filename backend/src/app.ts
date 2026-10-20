import { swaggerUI } from '@hono/swagger-ui'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { secureHeaders } from 'hono/secure-headers'
import { env } from './config/env'
import { onError, onNotFound } from './middlewares/error'
import { createRouter } from './lib/router'
import { authRoutes } from './routes/auth'
import { healthRoutes } from './routes/health'
import { invitationRoutes } from './routes/invitations'
import { adminThemeRoutes, themeRoutes } from './routes/themes'
import { uploadRoutes } from './routes/uploads'

export function createApp() {
  const config = env()
  const app = createRouter()

  if (config.NODE_ENV !== 'test') app.use(logger())
  app.use(secureHeaders())
  app.use(
    '/api/*',
    cors({
      origin: config.CORS_ORIGIN.split(',').map((o) => o.trim()),
      allowHeaders: ['Authorization', 'Content-Type'],
      allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    }),
  )

  app.route('/health', healthRoutes)
  app.route('/api/v1/auth', authRoutes())
  app.route('/api/v1/themes', themeRoutes())
  app.route('/api/v1/invitations', invitationRoutes())
  app.route('/api/v1/uploads', uploadRoutes())
  app.route('/api/v1/admin/themes', adminThemeRoutes())

  app.openAPIRegistry.registerComponent('securitySchemes', 'bearerAuth', {
    type: 'http',
    scheme: 'bearer',
    bearerFormat: 'JWT',
  })
  app.doc31('/openapi.json', {
    openapi: '3.1.0',
    info: { title: 'undaang API', version: '1.0.0' },
  })
  app.get('/docs', swaggerUI({ url: '/openapi.json' }))

  app.notFound(onNotFound)
  app.onError(onError)
  return app
}
