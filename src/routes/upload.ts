import { FastifyInstance } from 'fastify'
import readline from 'readline'
import { Readable } from 'node:stream'
import { PrismaClient } from '@prisma/client'
import { parseLogLine } from '../lib/parse'

const BATCH_SIZE = 1000

export async function uploadRoutes(app: FastifyInstance) {
  app.post('/api/logs/upload', async (request, reply) => {
    const prisma = app.prisma as PrismaClient
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
    let imported = 0
    let skipped = 0

    for await (const line of rl) {
      const parsed = parseLogLine(line)

      if (parsed) {
        logsToInsert.push(parsed)
      } else {
        skipped++
      }

      if (logsToInsert.length >= BATCH_SIZE) {
        await prisma.log.createMany({ data: logsToInsert })
        imported += logsToInsert.length
        logsToInsert.length = 0
      }
    }

    if (logsToInsert.length > 0) {
      await prisma.log.createMany({ data: logsToInsert })
      imported += logsToInsert.length
    }

    return reply.status(201).send({
      message: 'Arquivo processado e logs importados com sucesso!',
      imported,
      skipped,
    })
  })
}
