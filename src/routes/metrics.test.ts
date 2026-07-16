import { describe, it, expect, vi, beforeEach } from 'vitest'
import fastify from 'fastify'
import { metricsRoute } from './metrics'
import { setupPrismaMock } from '../test/prisma-mock'

const mockPrisma = vi.hoisted(() => ({
  log: {
    createMany: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    groupBy: vi.fn(),
  },
  $queryRaw: vi.fn(),
}))

vi.mock('../lib/prisma', () => ({ prisma: mockPrisma }))

describe('metrics route', () => {
  let app: ReturnType<typeof fastify>

  beforeEach(() => {
    setupPrismaMock(mockPrisma)
    mockPrisma.log.count.mockResolvedValue(7)
    mockPrisma.log.groupBy.mockResolvedValue([
      { level: 'INFO', _count: { _all: 5 } },
      { level: 'ERROR', _count: { _all: 2 } },
    ])
    mockPrisma.$queryRaw.mockResolvedValue([])
    app = fastify()
    app.register(metricsRoute)
  })

  it('returns 200 with summary, distribution, trends, trendsByLevel', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/metrics',
    })

    expect(res.statusCode).toBe(200)
    const json = res.json()
    expect(json.summary.total).toBe(7)
    expect(Array.isArray(json.distribution)).toBe(true)
    expect(json.distribution).toEqual([
      { level: 'INFO', count: 5 },
      { level: 'ERROR', count: 2 },
    ])
    expect(Array.isArray(json.trends)).toBe(true)
    expect(Array.isArray(json.trendsByLevel)).toBe(true)
    expect(mockPrisma.log.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({ by: ['level'] })
    )
  })
})
