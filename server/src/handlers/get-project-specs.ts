import type { IncomingMessage, ServerResponse } from 'http'
import { getProject } from '../registry.js'
import { walkDir } from '../utils/walk-dir.js'

export function handleGetProjectSpecs(req: IncomingMessage, res: ServerResponse, slug: string): void {
  const entry = getProject(slug)
  if (!entry) {
    res.statusCode = 404
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ error: `Project not found: ${slug}` }))
    return
  }

  const files = walkDir(entry.path)
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify({
    slug,
    rootDir: entry.path,
    files: Object.fromEntries(files),
  }))
}
