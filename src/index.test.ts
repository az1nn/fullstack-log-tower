import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createLogTower } from './index'

describe('createLogTower', () => {
  let mockPrisma: any

  beforeEach(() => {
    mockPrisma = {
      log: {
        createMany: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
        groupBy: vi.fn(),
      },
      $queryRaw: vi.fn(),
    }
  })

  it('returns an app with routes registered and prisma decorated, without listening', async () => {
    const app = createLogTower({ prisma: mockPrisma, startTracing: false })
    await app.ready()

    expect(app.prisma).toBe(mockPrisma)

    const res = await app.inject({ method: 'GET', url: '/api/health' })
    expect([200, 503]).toContain(res.statusCode)

    const pushRes = await app.inject({
      method: 'POST',
      url: '/api/logs/push',
      headers: { 'content-type': 'text/plain' },
      payload: '   ',
    })
    expect(pushRes.statusCode).toBe(400)

    await app.close()
  })
})
