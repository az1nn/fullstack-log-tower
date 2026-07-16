import fs from 'node:fs'
import { createInterface } from 'node:readline'

interface FileWatcher {
  fd: number
  offset: number
  buffer: string
  watcher: fs.FSWatcher
}

export function tailFiles(
  files: string[],
  onLine: (line: string) => void,
  onError?: (e: Error) => void
): () => void {
  const watchers = new Map<string, FileWatcher>()

  const readFrom = (path: string, watcher: FileWatcher) => {
    try {
      const stat = fs.fstatSync(watcher.fd)
      const size = stat.size

      if (size < watcher.offset) {
        watcher.offset = 0
        watcher.buffer = ''
      }

      if (size <= watcher.offset) {
        return
      }

      const length = size - watcher.offset
      const chunk = Buffer.alloc(length)
      fs.readSync(watcher.fd, chunk, 0, length, watcher.offset)
      watcher.offset = size

      watcher.buffer += chunk.toString('utf8')
      let newlineIndex = watcher.buffer.indexOf('\n')
      while (newlineIndex >= 0) {
        let line = watcher.buffer.slice(0, newlineIndex)
        if (line.endsWith('\r')) {
          line = line.slice(0, -1)
        }
        onLine(line)
        watcher.buffer = watcher.buffer.slice(newlineIndex + 1)
        newlineIndex = watcher.buffer.indexOf('\n')
      }
    } catch (err) {
      onError?.(err as Error)
    }
  }

  for (const file of files) {
    try {
      const fd = fs.openSync(file, 'r')
      const size = fs.fstatSync(fd).size
      const watcher: FileWatcher = { fd, offset: size, buffer: '', watcher: undefined as unknown as fs.FSWatcher }
      watcher.watcher = fs.watch(file, { persistent: true }, () => readFrom(file, watcher))
      watchers.set(file, watcher)
    } catch (err) {
      onError?.(err as Error)
    }
  }

  return () => {
    for (const watcher of watchers.values()) {
      watcher.watcher.close()
      fs.closeSync(watcher.fd)
    }
    watchers.clear()
  }
}
