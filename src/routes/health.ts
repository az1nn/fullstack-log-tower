import { FastifyInstance } from 'fastify'
import { PrismaClient } from '@prisma/client'

export async function healthRoute(app: FastifyInstance) {
  app.get('/api/health', async (request, reply) => {
    const prisma = app.prisma as PrismaClient
    const timestamp = new Date().toISOString()
    try {
      await prisma.$queryRaw`SELECT 1`
      return reply.send({ status: 'ok', db: 'up', timestamp })
    } catch {
      return reply.code(503).send({ status: 'ok', db: 'down', timestamp })
    }
  })
}
