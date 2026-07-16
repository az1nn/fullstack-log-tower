import { describe, it, expect } from 'vitest'
import { parseLogLine, mapLogLevel } from './parse'

describe('parseLogLine', () => {
  it('parses a valid line', () => {
    const result = parseLogLine('[2024-01-01T10:00:00.000Z] [INFO] hello world')
    expect(result).not.toBeNull()
    expect(result!.timestamp.toISOString()).toBe('2024-01-01T10:00:00.000Z')
    expect(result!.level).toBe('INFO')
    expect(result!.message).toBe('hello world')
    expect(result!.service).toBeUndefined()
  })

  it('parses a service suffix', () => {
    const result = parseLogLine('[2024-01-01T10:00:00.000Z] [ERROR] boom (service=auth)')
    expect(result!.level).toBe('ERROR')
    expect(result!.message).toBe('boom')
    expect(result!.service).toBe('auth')
  })

  it('returns null for an invalid line', () => {
    expect(parseLogLine('not a log line')).toBeNull()
  })

  it('returns null for an invalid timestamp', () => {
    expect(parseLogLine('[not-a-date] [INFO] hi')).toBeNull()
  })

  it('normalizes lowercase levels', () => {
    const result = parseLogLine('[2024-01-01T10:00:00.000Z] [warn] hi')
    expect(result!.level).toBe('WARN')
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
