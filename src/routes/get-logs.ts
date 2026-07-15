import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { LogLevel } from '@prisma/client'

const getLogsQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  perPage: z.coerce.number().min(1).max(100).default(20),
  level: z.nativeEnum(LogLevel).optional(),
  search: z.string().optional(),
  startDate: z.string().datetime().transform((val) => new Date(val)).optional(),
  endDate: z.string().datetime().transform((val) => new Date(val)).optional(),
})

export async function getLogsRoute(app: FastifyInstance) {
  app.get('/api/logs', async (request, reply) => {
    const { page, perPage, level, search, startDate, endDate } = getLogsQuerySchema.parse(request.query)

    const skip = (page - 1) * perPage
    const whereClause: any = {}

    if (level) whereClause.level = level

    if (search) {
      whereClause.message = {
        contains: search,
        mode: 'insensitive',
      }
    }

    if (startDate || endDate) {
      whereClause.timestamp = {}
      if (startDate) whereClause.timestamp.gte = startDate
      if (endDate) whereClause.timestamp.lte = endDate
    }

    const [logs, totalCount] = await Promise.all([
      prisma.log.findMany({
        where: whereClause,
        skip,
        take: perPage,
        orderBy: { timestamp: 'desc' },
      }),
      prisma.log.count({ where: whereClause }),
    ])

    const totalPages = Math.ceil(totalCount / perPage)

    return reply.status(200).send({
      data: logs,
      meta: {
        totalItems: totalCount,
        totalPages,
        currentPage: page,
        perPage,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    })
  })
}
