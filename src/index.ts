import fastify, { FastifyInstance } from 'fastify'
import cors from '@fastify/cors'
import multipart from '@fastify/multipart'
import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { ZodError } from 'zod'
import { PrismaClient } from '@prisma/client'
import { getDefaultPrisma } from './lib/prisma.js'
import { startTracing } from './lib/otel.js'
import { registerRequestLogger } from './lib/request-logger.js'
import { uploadRoutes } from './routes/upload.js'
import { getLogsRoute } from './routes/get-logs.js'
import { metricsRoute } from './routes/metrics.js'
import { seedRoutes } from './routes/seed.js'
import { healthRoute } from './routes/health.js'
import { pushRoutes } from './routes/push.js'

export interface LogTowerOptions {
  prisma?: PrismaClient
  corsOrigins?: string[]
  startTracing?: boolean
  maxFileSizeMb?: number
}

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient
  }
}

export function createLogTower(opts: LogTowerOptions = {}): FastifyInstance {
  const app = fastify({ logger: true })

  app.decorate('prisma', opts.prisma ?? getDefaultPrisma())

  app.register(cors, {
    origin: opts.corsOrigins ?? ['http://localhost:5173'],
  })

  app.register(multipart, {
    limits: { fileSize: (opts.maxFileSizeMb ?? 100) * 1024 * 1024 },
  })

  app.register(uploadRoutes)
  app.register(getLogsRoute)
  app.register(metricsRoute)
  app.register(seedRoutes)
  app.register(healthRoute)
  app.register(pushRoutes)

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

  const uiDir = path.resolve(process.cwd(), 'frontend/dist')
  if (fs.existsSync(uiDir)) {
    app.get('*', async (request, reply) => {
      const urlPath = request.url === '/' ? '/index.html' : request.url.split('?')[0]
      const filePath = path.join(uiDir, path.normalize(urlPath))

      if (!filePath.startsWith(uiDir)) {
        return reply.code(403).send('Forbidden')
      }

      try {
        const content = fs.readFileSync(filePath)
        const ext = path.extname(filePath)
        const types: Record<string, string> = {
          '.html': 'text/html',
          '.js': 'text/javascript',
          '.css': 'text/css',
          '.json': 'application/json',
          '.svg': 'image/svg+xml',
          '.png': 'image/png',
          '.ico': 'image/x-icon',
        }
        return reply.type(types[ext] ?? 'application/octet-stream').send(content)
      } catch {
        try {
          const fallback = fs.readFileSync(path.join(uiDir, 'index.html'))
          return reply.type('text/html').send(fallback)
        } catch {
          return reply.code(404).send('UI not found')
        }
      }
    })
  } else {
    app.log.warn('frontend/dist not found; UI will not be served. Build the frontend to enable the dashboard.')
  }

  return app
}

export async function startLogTower(app: FastifyInstance, port?: number): Promise<void> {
  const PORT = port ?? (Number(process.env.PORT) || 3333)

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

  await app.listen({ port: PORT, host: '0.0.0.0' })
  console.log(`🚀 LogTower running on http://localhost:${PORT}`)
}
