import type { IncomingMessage, ServerResponse } from 'http'
import { listProjects } from '../registry.js'

export function handleListProjects(_req: IncomingMessage, res: ServerResponse): void {
  const projects = listProjects()
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify({ projects }))
}
