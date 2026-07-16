import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { generateLogs } from '../scripts/seed'

const seedQuerySchema = z.object({
  count: z.coerce.number().min(1).max(50000).default(1000),
  days: z.coerce.number().min(1).max(365).default(30),
})

export async function seedRoutes(app: FastifyInstance) {
  app.post('/api/seed', async (request, reply) => {
    const { count, days } = seedQuerySchema.parse(request.query)

    const logs = generateLogs(count, days)

    const BATCH = 1000
    for (let i = 0; i < logs.length; i += BATCH) {
      await prisma.log.createMany({ data: logs.slice(i, i + BATCH) })
    }

    const total = await prisma.log.count()
    return reply.status(201).send({ message: 'Mock logs generated', imported: logs.length, total })
  })
}
