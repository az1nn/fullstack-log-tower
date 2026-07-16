import { writeFileSync } from 'fs'
import { generateLogs } from './seed.js'

const count = Number(process.env.GEN_COUNT ?? 2000)
const daysBack = Number(process.env.GEN_DAYS ?? 30)
const out = process.env.GEN_OUT ?? 'mock-logs.log'

const logs = generateLogs(count, daysBack)
const lines = logs.map(
  (l) => `[${l.timestamp.toISOString()}] [${l.level}] ${l.message} (service=${l.service})`,
)

writeFileSync(out, lines.join('\n') + '\n')
console.log(`✓ Wrote ${lines.length} log lines to ${out}`)
