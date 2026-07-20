import { FastifyInstance } from 'fastify'
import { PrismaClient } from '@prisma/client'
import { createHash } from 'node:crypto'
import { parseLogLine } from '../lib/parse.js'

const BATCH_SIZE = 1000

const uploadLocks = new Map<string, Promise<boolean>>()

async function claimUpload(uploadId: string): Promise<boolean> {
  const existing = uploadLocks.get(uploadId)
  if (existing) return existing
  const claimed = Promise.resolve(true)
  uploadLocks.set(uploadId, claimed)
  return claimed
}

export async function uploadRoutes(app: FastifyInstance) {
  app.post('/api/logs/upload', {
    schema: {
      description: 'Upload a log file (multipart/form-data with a "file" field) for ingestion',
      consumes: ['multipart/form-data'],
      tags: ['logs'],
      response: {
        201: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            imported: { type: 'number' },
            skipped: { type: 'number' },
            duplicates: { type: 'number' },
          },
        },
        400: {
          type: 'object',
          properties: { error: { type: 'string' } },
        },
      },
    },
  }, async (request, reply) => {
    const prisma = app.prisma as PrismaClient
    const data = await request.file()

    if (!data) {
      return reply.status(400).send({ error: 'Nenhum arquivo encontrado.' })
    }

    const chunks: Buffer[] = []
    const hash = createHash('sha256')
    for await (const chunk of data.file) {
      const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
      chunks.push(buf)
      hash.update(buf)
    }
    const buffer = Buffer.concat(chunks)
    const uploadId = hash.digest('hex')

    const logsToInsert: any[] = []
    let imported = 0
    let skipped = 0
    let duplicates = 0

    await claimUpload(uploadId)
    try {
      const alreadyImported = (await prisma.log.count({
        where: { upload_id: uploadId },
      })) > 0

      const flush = async () => {
        const count = logsToInsert.length
        if (alreadyImported) {
          duplicates += count
        } else {
          await prisma.log.createMany({ data: logsToInsert })
          imported += count
        }
        logsToInsert.length = 0
      }

      const lines = buffer.toString('utf8').split(/\r?\n/)
      for (const line of lines) {
        const parsed = parseLogLine(line)

        if (parsed) {
          logsToInsert.push({ ...parsed, upload_id: uploadId })
        } else if (line.trim().length > 0) {
          skipped++
        }

        if (logsToInsert.length >= BATCH_SIZE) {
          await flush()
        }
      }

      if (logsToInsert.length > 0) {
        await flush()
      }
    } finally {
      uploadLocks.delete(uploadId)
    }

    const message =
      imported === 0 && duplicates > 0
        ? 'File already imported'
        : 'Arquivo processado e logs importados com sucesso!'

    return reply.status(201).send({
      message,
      imported,
      skipped,
      duplicates,
    })
  })
}
