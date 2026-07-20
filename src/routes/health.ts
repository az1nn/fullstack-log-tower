import { FastifyInstance } from 'fastify'
import { PrismaClient } from '@prisma/client'

export async function healthRoute(app: FastifyInstance) {
  app.get('/api/health', {
    schema: {
      description: 'Health check',
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            db: { type: 'string' },
            timestamp: { type: 'string' },
          },
        },
        503: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            db: { type: 'string' },
            timestamp: { type: 'string' },
          },
        },
      },
    },
  }, async (request, reply) => {
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
