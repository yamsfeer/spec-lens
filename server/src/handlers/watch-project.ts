import type { IncomingMessage, ServerResponse } from 'http'
import { getProject } from '../registry.js'
import { startWatching, stopClient } from '../watcher.js'

export function handleWatchProject(req: IncomingMessage, res: ServerResponse, slug: string): void {
  const entry = getProject(slug)
  if (!entry) {
    res.statusCode = 404
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ error: `Project not found: ${slug}` }))
    return
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  })

  startWatching(entry.path, res)

  req.on('close', () => {
    stopClient(entry.path, res)
  })
}
