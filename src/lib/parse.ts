import { LogLevel } from '@prisma/client'

const logPattern = /^\[(.*?)\]\s+\[(.*?)\]\s+(.*?)(?:\s+\(service=(.*?)\))?\s*$/

export function mapLogLevel(level: string): LogLevel {
  const upperLevel = level.toUpperCase()
  const validLevels = ['INFO', 'WARN', 'ERROR', 'DEBUG', 'FATAL']

  if (validLevels.includes(upperLevel)) {
    return upperLevel as LogLevel
  }
  return 'INFO'
}

export function parseLogLine(
  line: string
): { timestamp: Date; level: LogLevel; message: string; service?: string } | null {
  const match = line.match(logPattern)

  if (!match) {
    return null
  }

  const [, dateString, levelStr, message, service] = match
  const timestamp = new Date(dateString)
  const level = mapLogLevel(levelStr)

  if (isNaN(timestamp.getTime())) {
    return null
  }

  const result: { timestamp: Date; level: LogLevel; message: string; service?: string } = {
    timestamp,
    level,
    message,
  }

  if (service) {
    result.service = service
  }

  return result
}
