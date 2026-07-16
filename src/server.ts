import fastify from 'fastify'
import cors from '@fastify/cors'
import multipart from '@fastify/multipart'
import { execSync } from 'node:child_process'
import { ZodError } from 'zod'
import { uploadRoutes } from './routes/upload'
import { getLogsRoute } from './routes/get-logs'
import { metricsRoute } from './routes/metrics'
import { seedRoutes } from './routes/seed'
import { healthRoute } from './routes/health'
import { startTracing } from './lib/otel'
import { registerRequestLogger } from './lib/request-logger'

const app = fastify({ logger: true })

app.register(cors, {
  origin: process.env.CORS_ORIGINS?.split(',').map((o) => o.trim()) ?? ['http://localhost:5173'],
})

app.register(multipart, {
  limits: { fileSize: 100 * 1024 * 1024 },
})

app.register(uploadRoutes)
app.register(getLogsRoute)
app.register(metricsRoute)
app.register(seedRoutes)
app.register(healthRoute)

registerRequestLogger(app)

app.setErrorHandler((error, request, reply) => {
  if (error instanceof ZodError) {
    return reply.status(400).send({
      message: 'Falha na validação dos campos.',
      errors: error.flatten().fieldErrors,
    })
  }

  app.log.error({ err: error, reqId: request.id }, error.message)
  return reply.status(500).send({ message: 'Erro interno do servidor.' })
})

const PORT = Number(process.env.PORT) || 3333

async function bootstrap() {
  try {
    await startTracing()
  } catch (err) {
    console.error('OpenTelemetry failed to start, continuing without tracing:', err)
  }

  try {
    console.log('Running database migrations...')
    execSync('npx prisma migrate deploy', { stdio: 'inherit' })
  } catch (err) {
    console.error('Migration failed, continuing startup:', err)
  }

  app.listen({ port: PORT, host: '0.0.0.0' }).then(() => {
    console.log(`🚀 HTTP Server running on http://localhost:${PORT}`)
  })
}

bootstrap()
