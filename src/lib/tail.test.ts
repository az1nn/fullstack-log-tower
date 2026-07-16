import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { tailFiles } from './tail'

describe('tailFiles', () => {
  let file: string
  let stop: () => void | undefined

  beforeEach(() => {
    file = path.join(os.tmpdir(), `tail-test-${Date.now()}-${Math.random()}.log`)
    fs.writeFileSync(file, '')
  })

  afterEach(() => {
    if (stop) stop()
    try {
      fs.unlinkSync(file)
    } catch {
      /* ignore */
    }
  })

  it('ingests only new lines written after start', async () => {
    const lines: string[] = []
    stop = tailFiles([file], (line) => lines.push(line))

    fs.appendFileSync(file, 'line1\nline2\n')

    await waitFor(() => lines.length >= 2)
    expect(lines).toEqual(['line1', 'line2'])
  })

  it('does not ingest pre-existing lines (starts at EOF)', async () => {
    fs.writeFileSync(file, 'preexisting\n')

    const lines: string[] = []
    stop = tailFiles([file], (line) => lines.push(line))

    fs.appendFileSync(file, 'newline\n')
    await waitFor(() => lines.length >= 1)
    expect(lines).toEqual(['newline'])
  })

  it('resets offset on truncation and re-reads', async () => {
    const lines: string[] = []
    stop = tailFiles([file], (line) => lines.push(line))

    fs.appendFileSync(file, 'a\nb\n')
    await waitFor(() => lines.length >= 2)

    fs.writeFileSync(file, 'c\n')
    await waitFor(() => lines.includes('c'))
    expect(lines).toContain('c')
  })
})

function waitFor(cond: () => boolean, timeoutMs = 2000): Promise<void> {
  return new Promise((resolve, reject) => {
    const start = Date.now()
    const tick = () => {
      if (cond()) return resolve()
      if (Date.now() - start > timeoutMs) return reject(new Error('timeout waiting for condition'))
      setTimeout(tick, 20)
    }
    tick()
  })
}
