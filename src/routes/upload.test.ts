import { describe, it, expect, vi, beforeEach } from 'vitest'
import fastify from 'fastify'
import multipart from '@fastify/multipart'
import { uploadRoutes } from './upload.js'
import { mapLogLevel } from '../lib/parse.js'
import { setupPrismaMock } from '../test/prisma-mock.js'

const mockPrisma = vi.hoisted(() => ({
  log: {
    createMany: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    groupBy: vi.fn(),
  },
  $queryRaw: vi.fn(),
}))

function buildMultipartBody(lines: string[]): string {
  const boundary = '----testboundary'
  return [
    `--${boundary}`,
    'Content-Disposition: form-data; name="file"; filename="test.log"',
    'Content-Type: text/plain',
    '',
    ...lines,
    `--${boundary}--`,
    '',
  ].join('\r\n')
}

const FILE_LINES = [
  '[2024-01-01T10:00:00.000Z] [INFO] hello',
  '[2024-01-01T10:01:00.000Z] [ERROR] something broke',
  'not a valid line',
]

vi.mock('../lib/prisma', () => ({ prisma: mockPrisma }))

describe('upload route', () => {
  let app: ReturnType<typeof fastify>
  const capturedCreateMany: any[] = []

  beforeEach(() => {
    setupPrismaMock(mockPrisma)
    capturedCreateMany.length = 0
    mockPrisma.log.createMany.mockImplementation(async (args: any) => {
      capturedCreateMany.push(JSON.parse(JSON.stringify(args.data)))
      return { count: (args.data as unknown[]).length }
    })
    app = fastify()
    app.register(multipart)
    app.register(uploadRoutes)
    app.decorate('prisma', mockPrisma)
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
    const body = buildMultipartBody(FILE_LINES)

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
    expect(json.skipped).toBe(1)
    expect(mockPrisma.log.createMany).toHaveBeenCalled()
  })

  it('parses a trailing (service=...) suffix into the service column', async () => {
    const boundary = '----testboundary'
    const body = buildMultipartBody([
      '[2024-01-01T10:00:00.000Z] [INFO] hello (service=auth)',
    ])

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
    expect(json.imported).toBe(1)
    expect(json.skipped).toBe(0)
    expect(json.duplicates).toBe(0)
    expect(capturedCreateMany.length).toBeGreaterThan(0)
    expect(capturedCreateMany[0][0]).toMatchObject({
      level: 'INFO',
      message: 'hello',
      service: 'auth',
      upload_id: expect.any(String),
    })
  })

  it('re-uploading the same file reports duplicates (idempotency enabled)', async () => {
    const boundary = '----testboundary'
    const body = buildMultipartBody(FILE_LINES)

    const first = await app.inject({
      method: 'POST',
      url: '/api/logs/upload',
      headers: {
        'content-type': `multipart/form-data; boundary=${boundary}`,
      },
      payload: body,
    })
    expect(first.statusCode).toBe(201)
    expect(first.json().imported).toBe(2)

    mockPrisma.log.count.mockResolvedValueOnce(2)

    const second = await app.inject({
      method: 'POST',
      url: '/api/logs/upload',
      headers: {
        'content-type': `multipart/form-data; boundary=${boundary}`,
      },
      payload: body,
    })
    expect(second.statusCode).toBe(201)
    expect(second.json().imported).toBe(0)
    expect(second.json().duplicates).toBe(2)
    expect(second.json().skipped).toBe(1)
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
