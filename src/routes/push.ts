import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { PrismaClient, LogLevel } from '@prisma/client'
import { mapLogLevel } from '../lib/parse.js'

const BATCH_SIZE = 1000

const pushItemSchema = z.object({
  timestamp: z.string().refine((v) => !isNaN(Date.parse(v)), { message: 'invalid timestamp' }),
  level: z.string().transform((v) => mapLogLevel(v)),
  message: z.string(),
  service: z.string().optional(),
})

export async function pushRoutes(app: FastifyInstance) {
  app.post('/api/logs/push', { config: { bodyLimit: 5 * 1024 * 1024 } }, async (request, reply) => {
    const prisma = app.prisma as PrismaClient
    const contentType = String(request.headers['content-type'] ?? '')

    let imported = 0
    let skipped = 0
    const batch: any[] = []

    const flush = async () => {
      if (batch.length === 0) return
      const chunk = batch.slice()
      await prisma.log.createMany({ data: chunk })
      imported += chunk.length
      batch.length = 0
    }

    try {
      if (contentType.includes('application/json')) {
        const parsed = pushItemSchema.array().safeParse(request.body)

        if (!parsed.success) {
          return reply.status(400).send({ error: 'Invalid JSON payload', details: parsed.error.flatten() })
        }

        for (const item of parsed.data) {
          batch.push({
            timestamp: new Date(item.timestamp),
            level: item.level,
            message: item.message,
            service: item.service,
          })
          if (batch.length >= BATCH_SIZE) await flush()
        }
      } else {
        const body = typeof request.body === 'string' ? request.body : String(request.body ?? '')
        if (!body.trim()) {
          return reply.status(400).send({ error: 'Empty body' })
        }

        for (const rawLine of body.split('\n')) {
          const line = rawLine.trim()
          if (!line) continue
          const parsed = parseLine(line)
          if (parsed) {
            batch.push(parsed)
            if (batch.length >= BATCH_SIZE) await flush()
          } else {
            skipped++
          }
        }
      }

      await flush()
    } catch (err) {
      return reply.status(400).send({ error: 'Invalid payload', message: (err as Error).message })
    }

    return reply.status(201).send({ imported, skipped })
  })
}

function parseLine(line: string): any | null {
  const match = line.match(/^\[(.*?)\]\s+\[(.*?)\]\s+(.*?)(?:\s+\(service=(.*?)\))?\s*$/)
  if (!match) return null
  const [, dateString, levelStr, message, service] = match
  const timestamp = new Date(dateString)
  if (isNaN(timestamp.getTime())) return null
  return {
    timestamp,
    level: mapLogLevel(levelStr) as LogLevel,
    message,
    service: service ?? undefined,
  }
}
