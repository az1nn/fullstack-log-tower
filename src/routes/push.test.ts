import { describe, it, expect, vi, beforeEach } from 'vitest'
import fastify from 'fastify'
import { pushRoutes } from './push.js'

const mockPrisma = vi.hoisted(() => ({
  log: {
    createMany: vi.fn(),
  },
}))

describe('push route', () => {
  let app: ReturnType<typeof fastify>

  beforeEach(() => {
    vi.clearAllMocks()
    mockPrisma.log.createMany.mockResolvedValue({ count: 0 })
    app = fastify()
    app.register(pushRoutes)
    app.decorate('prisma', mockPrisma)
  })

  it('ingests text/plain lines and returns counts', async () => {
    const body = [
      '[2024-01-01T10:00:00.000Z] [INFO] hello',
      '[2024-01-01T10:01:00.000Z] [ERROR] broken (service=auth)',
      'not a line',
    ].join('\n')

    const res = await app.inject({
      method: 'POST',
      url: '/api/logs/push',
      headers: { 'content-type': 'text/plain' },
      payload: body,
    })

    expect(res.statusCode).toBe(201)
    const json = res.json()
    expect(json.imported).toBe(2)
    expect(json.skipped).toBe(1)
    expect(mockPrisma.log.createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({ level: 'INFO', message: 'hello' }),
        expect.objectContaining({ level: 'ERROR', message: 'broken', service: 'auth' }),
      ]),
    })
  })

  it('ingests a JSON array and normalizes unknown levels', async () => {
    const body = JSON.stringify([
      { timestamp: '2024-01-01T10:00:00.000Z', level: 'info', message: 'hi' },
      { timestamp: '2024-01-01T10:01:00.000Z', level: 'weird', message: 'x', service: 'svc' },
    ])

    const res = await app.inject({
      method: 'POST',
      url: '/api/logs/push',
      headers: { 'content-type': 'application/json' },
      payload: body,
    })

    expect(res.statusCode).toBe(201)
    expect(res.json().imported).toBe(2)
    expect(mockPrisma.log.createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({ level: 'INFO', message: 'hi' }),
        expect.objectContaining({ level: 'INFO', message: 'x', service: 'svc' }),
      ]),
    })
  })

  it('returns 400 for an empty body', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/logs/push',
      headers: { 'content-type': 'text/plain' },
      payload: '   ',
    })
    expect(res.statusCode).toBe(400)
  })

  it('returns 400 for an invalid JSON payload', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/logs/push',
      headers: { 'content-type': 'application/json' },
      payload: JSON.stringify([{ level: 'INFO' }]),
    })
    expect(res.statusCode).toBe(400)
  })
})
