import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma'

const metricsQuerySchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
})

export async function metricsRoute(app: FastifyInstance) {
  app.get('/api/metrics', async (request, reply) => {
    const { startDate, endDate } = metricsQuerySchema.parse(request.query)

    const defaultStartDate = new Date()
    defaultStartDate.setDate(defaultStartDate.getDate() - 30)

    const filterStartDate = startDate ? new Date(startDate) : defaultStartDate
    const filterEndDate = endDate ? new Date(endDate) : new Date()

    const totalLogs = await prisma.log.count({
      where: {
        timestamp: {
          gte: filterStartDate,
          lte: filterEndDate,
        },
      },
    })

    const logsByLevel = await prisma.log.groupBy({
      by: ['level'],
      _count: { _all: true },
      where: {
        timestamp: {
          gte: filterStartDate,
          lte: filterEndDate,
        },
      },
    })

    const distribution = logsByLevel.map((item) => ({
      level: item.level,
      count: item._count._all,
    }))

    const trends = await prisma.$queryRaw<Array<{ date: Date; count: bigint }>>`
      SELECT
        DATE("timestamp") as "date",
        COUNT(*)::bigint as "count"
      FROM "Log"
      WHERE "timestamp" >= ${filterStartDate} AND "timestamp" <= ${filterEndDate}
      GROUP BY DATE("timestamp")
      ORDER BY "date" ASC
    `

    const formattedTrends = trends.map((trend) => ({
      date: trend.date.toISOString().split('T')[0],
      count: Number(trend.count),
    }))

    return reply.status(200).send({
      summary: { total: totalLogs },
      distribution,
      trends: formattedTrends,
    })
  })
}
