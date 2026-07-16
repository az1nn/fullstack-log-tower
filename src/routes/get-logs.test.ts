import { describe, it, expect, vi, beforeEach } from 'vitest'
import fastify from 'fastify'
import { ZodError } from 'zod'
import { getLogsRoute } from './get-logs'
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

describe('get-logs route', () => {
  let app: ReturnType<typeof fastify>

  beforeEach(() => {
    setupPrismaMock(mockPrisma)
    mockPrisma.log.findMany.mockResolvedValue([
      { id: 1, timestamp: new Date(), level: 'INFO', message: 'db ok', service: 'auth' },
    ])
    mockPrisma.log.count.mockResolvedValue(42)
    app = fastify()
    app.setErrorHandler((error: Error, _request: unknown, reply: any) => {
      if (error instanceof ZodError) {
        return reply.status(400).send({
          message: 'Falha na validação dos campos.',
          errors: error.flatten().fieldErrors,
        })
      }
      return reply.status(500).send({ message: 'Erro interno do servidor.' })
    })
    app.register(getLogsRoute)
  })

  it('returns 200 with data and meta', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/logs',
    })

    expect(res.statusCode).toBe(200)
    const json = res.json()
    expect(Array.isArray(json.data)).toBe(true)
    expect(json.meta).toEqual({
      totalItems: 42,
      totalPages: 3,
      currentPage: 1,
      perPage: 20,
      hasNextPage: true,
      hasPreviousPage: false,
    })
  })

  it('passes filter args to prisma', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/logs?level=ERROR&service=auth&search=db&page=2&perPage=10',
    })

    expect(res.statusCode).toBe(200)
    expect(mockPrisma.log.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          level: 'ERROR',
          service: { contains: 'auth', mode: 'insensitive' },
          message: { contains: 'db', mode: 'insensitive' },
        }),
        skip: 10,
        take: 10,
        orderBy: { timestamp: 'desc' },
      })
    )
  })

  it('returns 400 for invalid perPage', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/logs?perPage=200',
    })

    expect(res.statusCode).toBe(400)
  })
})
