import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { PrismaClient } from '@prisma/client'
import { LogLevel } from '@prisma/client'

const metricsQuerySchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
})

export async function metricsRoute(app: FastifyInstance) {
  app.get('/api/metrics', async (request, reply) => {
    const prisma = app.prisma as PrismaClient
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

    const ALL_LEVELS: LogLevel[] = ['INFO', 'WARN', 'ERROR', 'DEBUG', 'FATAL']
    const countByLevel = new Map<string, number>()
    for (const item of logsByLevel) {
      countByLevel.set(item.level, item._count._all)
    }
    const distribution = ALL_LEVELS.map((level) => ({
      level,
      count: countByLevel.get(level) ?? 0,
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

    const trendsByLevelRaw = await prisma.$queryRaw<Array<{
      date: Date
      level: string
      count: bigint
    }>>`
      SELECT
        DATE("timestamp") as "date",
        "level" as "level",
        COUNT(*)::bigint as "count"
      FROM "Log"
      WHERE "timestamp" >= ${filterStartDate} AND "timestamp" <= ${filterEndDate}
      GROUP BY DATE("timestamp"), "level"
      ORDER BY "date" ASC
    `

    const dayLevelMap = new Map<string, { date: string; INFO: number; WARN: number; ERROR: number; DEBUG: number; FATAL: number }>()
    for (const row of trendsByLevelRaw) {
      const date = row.date.toISOString().split('T')[0]
      const entry = dayLevelMap.get(date) || { date, INFO: 0, WARN: 0, ERROR: 0, DEBUG: 0, FATAL: 0 }
      const level = row.level.toUpperCase() as keyof Omit<typeof entry, 'date'>
      entry[level] = Number(row.count)
      dayLevelMap.set(date, entry)
    }

    const trendsByLevel = Array.from(dayLevelMap.values()).sort((a, b) => a.date.localeCompare(b.date))

    return reply.status(200).send({
      summary: { total: totalLogs },
      distribution,
      trends: formattedTrends,
      trendsByLevel,
    })
  })
}
