import type { IncomingMessage, ServerResponse } from 'http'
import { removeProject, getProject } from '../registry.js'
import { stopWatching } from '../watcher.js'

export function handleRemoveProject(_req: IncomingMessage, res: ServerResponse, slug: string): void {
  const project = getProject(slug)
  const found = removeProject(slug)

  if (!found) {
    res.statusCode = 404
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ error: `Project not found: ${slug}` }))
    return
  }

  if (project) {
    stopWatching(project.path)
  }

  res.statusCode = 204
  res.end()
}
