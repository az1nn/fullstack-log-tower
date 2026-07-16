import { describe, it, expect, vi, beforeEach } from 'vitest'
import fastify from 'fastify'
import multipart from '@fastify/multipart'
import { uploadRoutes } from './upload'
import { mapLogLevel } from './upload'
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

describe('upload route', () => {
  let app: ReturnType<typeof fastify>

  beforeEach(() => {
    setupPrismaMock(mockPrisma)
    app = fastify()
    app.register(multipart)
    app.register(uploadRoutes)
  })

  it('returns 400 when no file is provided', async () => {
    const boundary = '----testboundary'
    const body = [
      `--${boundary}`,
      'Content-Disposition: form-data; name="other"',
      '',
      'not a file',
      `--${boundary}--`,
      '',
    ].join('\r\n')

    const res = await app.inject({
      method: 'POST',
      url: '/api/logs/upload',
      headers: {
        'content-type': `multipart/form-data; boundary=${boundary}`,
      },
      payload: body,
    })

    expect(res.statusCode).toBe(400)
    expect(res.json().error).toBeDefined()
    expect(mockPrisma.log.createMany).not.toHaveBeenCalled()
  })

  it('ingests parsed log lines and returns 201', async () => {
    const boundary = '----testboundary'
    const body = [
      `--${boundary}`,
      'Content-Disposition: form-data; name="file"; filename="test.log"',
      'Content-Type: text/plain',
      '',
      '[2024-01-01T10:00:00.000Z] [INFO] hello',
      '[2024-01-01T10:01:00.000Z] [ERROR] something broke',
      'not a valid line',
      `--${boundary}--`,
      '',
    ].join('\r\n')

    const res = await app.inject({
      method: 'POST',
      url: '/api/logs/upload',
      headers: {
        'content-type': `multipart/form-data; boundary=${boundary}`,
      },
      payload: body,
    })

    expect(res.statusCode).toBe(201)
    const json = res.json()
    expect(json.imported).toBe(2)
    expect(mockPrisma.log.createMany).toHaveBeenCalled()
  })
})

describe('mapLogLevel', () => {
  it('maps valid levels uppercase', () => {
    expect(mapLogLevel('info')).toBe('INFO')
    expect(mapLogLevel('error')).toBe('ERROR')
  })

  it('defaults unknown levels to INFO', () => {
    expect(mapLogLevel('trace')).toBe('INFO')
  })
})
