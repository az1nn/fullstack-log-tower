import { describe, it, expect, vi, beforeEach } from 'vitest'
import fastify from 'fastify'
import { healthRoute } from './health.js'

const mockPrisma = vi.hoisted(() => ({
  $queryRaw: vi.fn(),
}))

vi.mock('../lib/prisma', () => ({ prisma: mockPrisma }))

describe('health route', () => {
  let app: ReturnType<typeof fastify>

  beforeEach(() => {
    vi.clearAllMocks()
    app = fastify()
    app.register(healthRoute)
    app.decorate('prisma', mockPrisma)
  })

  it('returns 200 with db up when the database is reachable', async () => {
    mockPrisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }])

    const res = await app.inject({ method: 'GET', url: '/api/health' })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toMatchObject({ status: 'ok', db: 'up' })
    expect(typeof res.json().timestamp).toBe('string')
  })

  it('returns 503 with db down when the database ping fails', async () => {
    mockPrisma.$queryRaw.mockRejectedValue(new Error('connection refused'))

    const res = await app.inject({ method: 'GET', url: '/api/health' })

    expect(res.statusCode).toBe(503)
    expect(res.json()).toMatchObject({ status: 'ok', db: 'down' })
  })
})
