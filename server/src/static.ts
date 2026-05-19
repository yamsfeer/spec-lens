import fs from 'fs'
import path from 'path'
import type { IncomingMessage, ServerResponse } from 'http'
import { getMimeType } from './utils/mime.js'

export function serveStatic(req: IncomingMessage, res: ServerResponse, distDir: string): void {
  const urlPath = req.url?.split('?')[0] || '/'
  let filePath = path.join(distDir, urlPath)

  // Security: prevent path traversal
  if (!filePath.startsWith(distDir)) {
    res.statusCode = 403
    res.end()
    return
  }

  // SPA fallback: if file doesn't exist or path is a directory, serve index.html
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(distDir, 'index.html')
  }

  if (!fs.existsSync(filePath)) {
    res.statusCode = 404
    res.end()
    return
  }

  res.setHeader('Content-Type', getMimeType(filePath))
  fs.createReadStream(filePath).pipe(res)
}
