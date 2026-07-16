import { FastifyInstance } from 'fastify'
import { beforeAll, afterAll, describe, it, expect } from 'vitest'
import { seedRoutes } from '../routes/seed'
import { getLogsRoute } from '../routes/get-logs'
import { prisma } from '../lib/prisma'
import { generateLogs } from '../scripts/seed'

let app: FastifyInstance
let dbAvailable = false

async function isDbAvailable(): Promise<boolean> {
  try {
    await prisma.log.count()
    return true
  } catch {
    return false
  }
}

beforeAll(async () => {
  dbAvailable = await isDbAvailable()
  if (!dbAvailable) {
    console.warn('Skipping seed integration tests: no Postgres reachable')
    return
  }
  const fastify = (await import('fastify')).default
  app = fastify({ logger: false })
  app.register(seedRoutes)
  app.register(getLogsRoute)
  await app.ready()
  await prisma.log.deleteMany()
}, 60000)

afterAll(async () => {
  if (!dbAvailable) return
  await prisma.log.deleteMany()
  await prisma.$disconnect()
  await app.close()
})

describe('integration: mock log generation against real Postgres', () => {
  it('generateLogs produces the configured number of parseable rows', () => {
    const logs = generateLogs(50, 30)
    expect(logs).toHaveLength(50)
    const validLevels = ['INFO', 'WARN', 'ERROR', 'DEBUG', 'FATAL']
    expect(logs.every((l) => validLevels.includes(l.level))).toBe(true)
    expect(logs.every((l) => l.service && l.message)).toBe(true)
    expect(logs.every((l) => !isNaN(l.timestamp.getTime()))).toBe(true)
  })

  it('POST /api/seed inserts logs and they become queryable', async () => {
    if (!dbAvailable) return
    const before = await prisma.log.count()
    const res = await app.inject({
      method: 'POST',
      url: '/api/seed?count=40&days=15',
    })
    expect(res.statusCode).toBe(201)
    const body = res.json()
    expect(body.imported).toBe(40)
    expect(body.total).toBe(before + 40)

    const after = await prisma.log.count()
    expect(after).toBe(before + 40)

    const getRes = await app.inject({
      method: 'GET',
      url: '/api/logs?perPage=5',
    })
    expect(getRes.json().meta.totalItems).toBe(after)
  })

  it('seed validates count bounds', async () => {
    if (!dbAvailable) return
    const res = await app.inject({
      method: 'POST',
      url: '/api/seed?count=0',
    })
    expect(res.statusCode).toBe(400)
  })
})
