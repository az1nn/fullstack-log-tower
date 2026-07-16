import { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma'
import readline from 'readline'
import { Readable } from 'node:stream'
import { LogLevel } from '@prisma/client'

export async function uploadRoutes(app: FastifyInstance) {
  app.post('/api/logs/upload', async (request, reply) => {
    const data = await request.file()

    if (!data) {
      return reply.status(400).send({ error: 'Nenhum arquivo encontrado.' })
    }

    const chunks: Buffer[] = []
    for await (const chunk of data.file) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
    }
    const buffer = Buffer.concat(chunks)

    const rl = readline.createInterface({
      input: Readable.from(buffer),
      crlfDelay: Infinity,
    })

    const logsToInsert: any[] = []
    const BATCH_SIZE = 1000
    let imported = 0
    let skipped = 0
    const logPattern = /^\[(.*?)\]\s+\[(.*?)\]\s+(.*?)(?:\s+\(service=(.*?)\))?\s*$/

    for await (const line of rl) {
      const match = line.match(logPattern)

      if (match) {
        const [, dateString, levelStr, message, service] = match
        const timestamp = new Date(dateString)
        const level = mapLogLevel(levelStr)

        if (!isNaN(timestamp.getTime())) {
          logsToInsert.push({ timestamp, level, message, service })
        }
      } else {
        skipped++
      }

      if (logsToInsert.length >= BATCH_SIZE) {
        await insertBatch(logsToInsert)
        imported += logsToInsert.length
        logsToInsert.length = 0
      }
    }

    if (logsToInsert.length > 0) {
      await insertBatch(logsToInsert)
      imported += logsToInsert.length
    }

    return reply.status(201).send({
      message: 'Arquivo processado e logs importados com sucesso!',
      imported,
      skipped,
    })
  })
}

async function insertBatch(batch: any[]) {
  await prisma.log.createMany({ data: batch })
}

export function mapLogLevel(level: string): LogLevel {
  const upperLevel = level.toUpperCase()
  const validLevels = ['INFO', 'WARN', 'ERROR', 'DEBUG', 'FATAL']

  if (validLevels.includes(upperLevel)) {
    return upperLevel as LogLevel
  }
  return 'INFO'
}
