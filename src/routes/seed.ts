import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { PrismaClient } from '@prisma/client'
import { generateLogs, insertLogsInBatches } from '../scripts/seed.js'

const seedQuerySchema = z.object({
  count: z.coerce.number().min(1).max(50000).default(1000),
  days: z.coerce.number().min(1).max(365).default(30),
})

export async function seedRoutes(app: FastifyInstance) {
  app.post('/api/seed', async (request, reply) => {
    const prisma = app.prisma as PrismaClient
    const { count, days } = seedQuerySchema.parse(request.query)

    const logs = generateLogs(count, days)

    const imported = await insertLogsInBatches(prisma, logs)

    const total = await prisma.log.count()
    return reply.status(201).send({ message: 'Mock logs generated', imported, total })
  })
}
