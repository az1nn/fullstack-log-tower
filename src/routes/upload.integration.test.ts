import { FastifyInstance } from 'fastify'
import multipart from '@fastify/multipart'
import { beforeAll, beforeEach, afterAll, describe, it, expect } from 'vitest'
import { uploadRoutes } from '../routes/upload.js'
import { getLogsRoute } from '../routes/get-logs.js'
import { prisma } from '../lib/prisma.js'

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

function buildLogText(lines: Array<[string, string, string, string]>): string {
  return lines
    .map(([ts, level, message, service]) => `[${ts}] [${level}] ${message} (service=${service})`)
    .join('\n')
}

function multipartBody(content: string, filename = 'test.log'): string {
  const boundary = '----integrationboundary'
  return [
    `--${boundary}`,
    `Content-Disposition: form-data; name="file"; filename="${filename}"`,
    'Content-Type: text/plain',
    '',
    content,
    `--${boundary}--`,
    '',
  ].join('\r\n')
}

const SAMPLE = buildLogText([
  ['2024-01-01T10:00:00.000Z', 'INFO', 'Request completed', 'web'],
  ['2024-01-01T10:01:00.000Z', 'ERROR', 'Database connection refused', 'api'],
  ['2024-01-01T10:02:00.000Z', 'WARN', 'Slow query detected', 'db'],
])

beforeAll(async () => {
  dbAvailable = await isDbAvailable()
  if (!dbAvailable) {
    console.warn('Skipping ingestion integration tests: no Postgres reachable')
    return
  }
  const fastify = (await import('fastify')).default
  app = fastify({ logger: false })
  app.decorate('prisma', prisma)
  app.register(multipart)
  app.register(uploadRoutes)
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

describe('integration: log ingestion against real Postgres', () => {
  beforeEach(async () => {
    if (!dbAvailable) return
    await prisma.log.deleteMany()
  })

  const uniqueSample = (marker: string) =>
    `${SAMPLE}\n[2024-03-03T00:00:00.000Z] [INFO] marker-${marker}-${Date.now()} (service=marker)`

  it('ingests parsed log lines and persists them', async () => {
    if (!dbAvailable) return
    const res = await app.inject({
      method: 'POST',
      url: '/api/logs/upload',
      headers: { 'content-type': 'multipart/form-data; boundary=----integrationboundary' },
      payload: multipartBody(uniqueSample('ingest')),
    })
    expect(res.statusCode).toBe(201)
    const body = res.json()
    expect(body.imported).toBe(4)
    expect(body.skipped).toBe(0)

    const rows = await prisma.log.findMany({ orderBy: { timestamp: 'asc' } })
    expect(rows[0].level).toBe('INFO')
    expect(rows[0].service).toBe('web')
    expect(rows[2].message).toBe('Slow query detected')
  })

  it('counts unparseable lines as skipped', async () => {
    if (!dbAvailable) return
    const res = await app.inject({
      method: 'POST',
      url: '/api/logs/upload',
      headers: { 'content-type': 'multipart/form-data; boundary=----integrationboundary' },
      payload: multipartBody(`${uniqueSample('skipped')}\nthis line does not match the format`),
    })
    const body = res.json()
    expect(body.imported).toBe(4)
    expect(body.skipped).toBe(1)
  })

  it('re-uploading the same file reports duplicates (idempotency enabled)', async () => {
    if (!dbAvailable) return
    const first = await app.inject({
      method: 'POST',
      url: '/api/logs/upload',
      headers: { 'content-type': 'multipart/form-data; boundary=----integrationboundary' },
      payload: multipartBody(SAMPLE),
    })
    expect(first.json().imported).toBe(3)

    const countBefore = await prisma.log.count()
    const second = await app.inject({
      method: 'POST',
      url: '/api/logs/upload',
      headers: { 'content-type': 'multipart/form-data; boundary=----integrationboundary' },
      payload: multipartBody(SAMPLE),
    })
    const secondBody = second.json()
    expect(second.statusCode).toBe(201)
    expect(secondBody.imported).toBe(0)
    expect(secondBody.duplicates).toBe(3)
    expect(await prisma.log.count()).toBe(countBefore)
  })

  it('different content inserts as a new upload', async () => {
    if (!dbAvailable) return
    const different = buildLogText([
      ['2024-02-02T12:00:00.000Z', 'FATAL', 'Out of memory', 'worker'],
    ])
    const res = await app.inject({
      method: 'POST',
      url: '/api/logs/upload',
      headers: { 'content-type': 'multipart/form-data; boundary=----integrationboundary' },
      payload: multipartBody(different),
    })
    const body = res.json()
    expect(body.imported).toBe(1)
  })

  it('uploaded logs are queryable via GET /api/logs', async () => {
    if (!dbAvailable) return
    await app.inject({
      method: 'POST',
      url: '/api/logs/upload',
      headers: { 'content-type': 'multipart/form-data; boundary=----integrationboundary' },
      payload: multipartBody(uniqueSample('queryable')),
    })
    const res = await app.inject({
      method: 'GET',
      url: '/api/logs?level=ERROR&perPage=10',
    })
    const body = res.json()
    expect(body.data.length).toBeGreaterThan(0)
    expect(body.data.every((l: any) => l.level === 'ERROR')).toBe(true)
  })
})
