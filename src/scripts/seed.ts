import { PrismaClient } from '@prisma/client'
import { LogLevel } from '@prisma/client'

const prisma = new PrismaClient()

const SERVICES = ['auth', 'api-gateway', 'payment', 'scheduler', 'web', 'worker', 'database']
const LEVELS: LogLevel[] = ['INFO', 'WARN', 'ERROR', 'DEBUG', 'FATAL']

const MESSAGES: Record<LogLevel, string[]> = {
  INFO: [
    'Request completed successfully',
    'User session started',
    'Cache warmed for key',
    'Health check passed',
    'Job enqueued',
  ],
  WARN: [
    'High latency detected on downstream call',
    'Retry attempt scheduled',
    'Memory usage above 80%',
    'Deprecated endpoint called',
    'Slow query detected',
  ],
  ERROR: [
    'Unhandled exception in request handler',
    'Database connection refused',
    'Failed to process payment',
    'Timeout while calling upstream service',
    'Validation error on payload',
  ],
  DEBUG: [
    'Entering function with params',
    'Cache hit for query',
    'Connection pool acquired',
    'Parsed configuration',
    'Trace span started',
  ],
  FATAL: [
    'Out of memory - process terminating',
    'Unrecoverable disk failure',
    'Sev1 incident: primary node down',
    'Corruption detected in store',
    'Panic in worker thread',
  ],
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randomTimestamp(daysBack: number): Date {
  const now = Date.now()
  const span = daysBack * 24 * 60 * 60 * 1000
  return new Date(now - Math.random() * span)
}

export function generateLogs(count: number, daysBack = 30): Array<{
  timestamp: Date
  level: LogLevel
  message: string
  service: string
}> {
  const logs = []
  // Weighted levels so INFO/DEBUG dominate, ERROR/FATAL are rarer
  const weighted: LogLevel[] = [
    ...Array(40).fill('INFO'),
    ...Array(25).fill('DEBUG'),
    ...Array(20).fill('WARN'),
    ...Array(12).fill('ERROR'),
    ...Array(3).fill('FATAL'),
  ] as LogLevel[]

  for (let i = 0; i < count; i++) {
    const level = pick(weighted)
    logs.push({
      timestamp: randomTimestamp(daysBack),
      level,
      message: pick(MESSAGES[level]),
      service: pick(SERVICES),
    })
  }
  return logs
}

async function main() {
  const count = Number(process.env.SEED_COUNT ?? 5000)
  const daysBack = Number(process.env.SEED_DAYS ?? 30)

  console.log(`Generating ${count} mock logs over ${daysBack} days...`)
  const logs = generateLogs(count, daysBack)

  const BATCH = 1000
  for (let i = 0; i < logs.length; i += BATCH) {
    const slice = logs.slice(i, i + BATCH)
    await prisma.log.createMany({ data: slice })
  }

  const total = await prisma.log.count()
  console.log(`✓ Inserted ${logs.length} logs. Total in DB: ${total}`)
}

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  main()
    .catch((e) => {
      console.error(e)
      process.exit(1)
    })
    .finally(async () => {
      await prisma.$disconnect()
    })
}
