import type { ServerResponse } from 'http'
import type { FSWatcher } from 'chokidar'
import chokidar from 'chokidar'
import fs from 'fs'
import type { SSEEvent } from './types.js'

interface WatcherEntry {
  watcher: FSWatcher
  clients: Set<ServerResponse>
}

const watchers = new Map<string, WatcherEntry>()

export function startWatching(projectPath: string, client: ServerResponse): void {
  let entry = watchers.get(projectPath)

  if (!entry) {
    const watcher = chokidar.watch(projectPath, {
      ignored: (filePath: string) => {
        // Ignore dotfiles and non-markdown files
        const base = filePath.split('/').pop() ?? ''
        if (base.startsWith('.')) return true
        return !/\.(md|markdown)$/i.test(base) && base !== projectPath.split('/').pop()
      },
      ignoreInitial: true,
      awaitWriteFinish: { stabilityThreshold: 300 },
      persistent: true,
    })

    entry = { watcher, clients: new Set() }
    watchers.set(projectPath, entry)

    watcher.on('add', (filePath) => handleFileEvent(projectPath, 'add', filePath))
    watcher.on('change', (filePath) => handleFileEvent(projectPath, 'change', filePath))
    watcher.on('unlink', (filePath) => handleFileEvent(projectPath, 'unlink', filePath))
    watcher.on('error', (error) => {
      broadcast(projectPath, { type: 'error', message: String(error) })
    })
  }

  entry.clients.add(client)
}

export function stopClient(projectPath: string, client: ServerResponse): void {
  const entry = watchers.get(projectPath)
  if (!entry) return

  entry.clients.delete(client)
  if (entry.clients.size === 0) {
    entry.watcher.close()
    watchers.delete(projectPath)
  }
}

export function stopWatching(projectPath: string): void {
  const entry = watchers.get(projectPath)
  if (!entry) return

  for (const client of entry.clients) {
    client.end()
  }
  entry.watcher.close()
  watchers.delete(projectPath)
}

function handleFileEvent(projectPath: string, type: 'add' | 'change' | 'unlink', filePath: string): void {
  const relPath = filePath.slice(projectPath.length + 1).replace(/\\/g, '/')

  if (type === 'unlink') {
    broadcast(projectPath, { type: 'unlink', path: relPath })
    return
  }

  try {
    const content = fs.readFileSync(filePath, 'utf-8')
    broadcast(projectPath, { type, path: relPath, content })
  } catch {
    broadcast(projectPath, { type: 'error', message: `Failed to read ${relPath}` })
  }
}

function broadcast(projectPath: string, event: SSEEvent): void {
  const entry = watchers.get(projectPath)
  if (!entry) return

  const data = `data: ${JSON.stringify(event)}\n\n`
  for (const client of entry.clients) {
    try {
      client.write(data)
    } catch {
      // Client disconnected; will be cleaned up on close event
    }
  }
}
