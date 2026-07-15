import { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma'
import readline from 'readline'
import { LogLevel } from '@prisma/client'

export async function uploadRoutes(app: FastifyInstance) {
  app.post('/api/logs/upload', async (request, reply) => {
    const data = await request.file()

    if (!data) {
      return reply.status(400).send({ error: 'Nenhum arquivo encontrado.' })
    }

    const rl = readline.createInterface({
      input: data.file,
      crlfDelay: Infinity,
    })

    const logsToInsert: any[] = []
    const BATCH_SIZE = 1000
    const logPattern = /^\[(.*?)\]\s+\[(.*?)\]\s+(.*)$/

    for await (const line of rl) {
      const match = line.match(logPattern)

      if (match) {
        const [, dateString, levelStr, message] = match
        const timestamp = new Date(dateString)
        const level = mapLogLevel(levelStr)

        if (!isNaN(timestamp.getTime())) {
          logsToInsert.push({ timestamp, level, message })
        }
      }

      if (logsToInsert.length >= BATCH_SIZE) {
        await prisma.log.createMany({ data: logsToInsert })
        logsToInsert.length = 0
      }
    }

    if (logsToInsert.length > 0) {
      await prisma.log.createMany({ data: logsToInsert })
    }

    return reply.status(201).send({ message: 'Arquivo processado e logs importados com sucesso!' })
  })
}

function mapLogLevel(level: string): LogLevel {
  const upperLevel = level.toUpperCase()
  const validLevels = ['INFO', 'WARN', 'ERROR', 'DEBUG', 'FATAL']

  if (validLevels.includes(upperLevel)) {
    return upperLevel as LogLevel
  }
  return 'INFO'
}
