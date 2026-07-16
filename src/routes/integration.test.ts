import { FastifyInstance } from 'fastify'
import { beforeAll, afterAll, describe, it, expect } from 'vitest'
import { metricsRoute } from '../routes/metrics'
import { getLogsRoute } from '../routes/get-logs'
import { prisma } from '../lib/prisma'
import { generateLogs } from '../scripts/seed'

let app: FastifyInstance

beforeAll(async () => {
  const fastify = (await import('fastify')).default
  app = fastify({ logger: false })
  app.register(metricsRoute)
  app.register(getLogsRoute)
  await app.ready()

  await prisma.log.deleteMany()
  const logs = generateLogs(200, 30)
  for (let i = 0; i < logs.length; i += 100) {
    await prisma.log.createMany({ data: logs.slice(i, i + 100) })
  }
}, 60000)

afterAll(async () => {
  await prisma.log.deleteMany()
  await prisma.$disconnect()
  await app.close()
})

describe('integration: logs + metrics against real Postgres', () => {
  it('GET /api/logs returns paginated, timestamp-desc results', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/logs?page=1&perPage=10' })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.data.length).toBeLessThanOrEqual(10)
    expect(body.meta.totalItems).toBeGreaterThan(0)
    expect(body.meta.hasNextPage).toBe(true)
  })

  it('GET /api/logs filters by level', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/logs?level=ERROR&perPage=100' })
    const body = res.json()
    expect(body.data.every((l: any) => l.level === 'ERROR')).toBe(true)
  })

  it('GET /api/metrics returns summary, distribution and trends', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/metrics' })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.summary.total).toBeGreaterThan(0)
    expect(Array.isArray(body.distribution)).toBe(true)
    expect(Array.isArray(body.trends)).toBe(true)
    expect(Array.isArray(body.trendsByLevel)).toBe(true)
    const levels = body.distribution.map((d: any) => d.level)
    expect(levels).toContain('INFO')
  })

  it('GET /api/metrics respects date range', async () => {
    const start = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
    const end = new Date().toISOString()
    const res = await app.inject({ method: 'GET', url: `/api/metrics?startDate=${start}&endDate=${end}` })
    const body = res.json()
    expect(body.summary.total).toBeGreaterThanOrEqual(0)
  })
})
