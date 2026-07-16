import { createLogTower, startLogTower, LogTowerOptions } from './index'
import { tailFiles } from './lib/tail'
import { parseLogLine } from './lib/parse'

interface CliArgs {
  tail: string[]
  port: number
  db?: string
  ui: boolean
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = { tail: [], port: 3333, ui: false }
  const tailValues: string[] = []

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--tail') {
      const val = argv[++i]
      if (val) tailValues.push(...val.split(',').map((v) => v.trim()).filter(Boolean))
    } else if (arg === '--port') {
      const val = argv[++i]
      if (val) args.port = Number(val) || 3333
    } else if (arg === '--db') {
      const val = argv[++i]
      if (val) args.db = val
    } else if (arg === '--ui') {
      args.ui = true
    }
  }

  args.tail = tailValues
  return args
}

async function main() {
  const args = parseArgs(process.argv.slice(2))

  if (args.db) {
    process.env.DATABASE_URL = args.db
  }

  const opts: LogTowerOptions = {}
  const app = createLogTower(opts)

  await app.ready()

  if (args.tail.length > 0) {
    const stop = tailFiles(
      args.tail,
      async (line) => {
        const parsed = parseLogLine(line)
        if (parsed) {
          try {
            await app.prisma.log.create({ data: parsed })
          } catch (err) {
            app.log.error({ err }, 'Failed to insert tailed log line')
          }
        }
      },
      (err) => app.log.error({ err }, 'Tail error')
    )

    console.log(`Tailing files: ${args.tail.join(', ')}`)
    process.on('SIGINT', () => {
      stop()
      process.exit(0)
    })
    process.on('SIGTERM', () => {
      stop()
      process.exit(0)
    })
  }

  await startLogTower(app, args.port)
  console.log(`LogTower UI: http://localhost:${args.port}/`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
