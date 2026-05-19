import http from 'http'
import path from 'path'
import { fileURLToPath } from 'url'
import { handleListProjects } from './handlers/list-projects.js'
import { handleGetProjectSpecs } from './handlers/get-project-specs.js'
import { handleRemoveProject } from './handlers/remove-project.js'
import { handleWatchProject } from './handlers/watch-project.js'
import { serveStatic } from './static.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export interface ServerOptions {
  port: number
  staticDir?: string
}

export function createServer(options: ServerOptions): http.Server {
  const distDir = options.staticDir ?? path.join(__dirname, '..', '..', 'dist')

  const server = http.createServer((req, res) => {
    const url = new URL(req.url ?? '/', `http://${req.headers.host}`)
    const pathname = url.pathname

    // API routes
    if (pathname.startsWith('/api/')) {
      // CORS headers for dev mode
      res.setHeader('Access-Control-Allow-Origin', '*')
      res.setHeader('Access-Control-Allow-Methods', 'GET, DELETE, OPTIONS')
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

      if (req.method === 'OPTIONS') {
        res.statusCode = 204
        res.end()
        return
      }

      // GET /api/projects
      if (pathname === '/api/projects' && req.method === 'GET') {
        handleListProjects(req, res)
        return
      }

      // Match /api/projects/:slug/specs or /api/projects/:slug/watch or /api/projects/:slug
      const projectMatch = pathname.match(/^\/api\/projects\/([^/]+)(?:\/(specs|watch))?$/)
      if (projectMatch) {
        const slug = projectMatch[1]
        const subRoute = projectMatch[2]

        if (subRoute === 'specs' && req.method === 'GET') {
          handleGetProjectSpecs(req, res, slug)
          return
        }

        if (subRoute === 'watch' && req.method === 'GET') {
          handleWatchProject(req, res, slug)
          return
        }

        if (!subRoute && req.method === 'DELETE') {
          handleRemoveProject(req, res, slug)
          return
        }
      }

      res.statusCode = 404
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ error: 'Not found' }))
      return
    }

    // Static file serving (production)
    serveStatic(req, res, distDir)
  })

  return server
}

export function startServer(options: ServerOptions): Promise<void> {
  return new Promise((resolve, reject) => {
    const server = createServer(options)
    server.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`  Error: Port ${options.port} is already in use.`)
        process.exit(1)
      }
      reject(err)
    })
    server.listen(options.port, () => {
      console.log(`  spec-lens server running at http://localhost:${options.port}`)
      resolve()
    })
  })
}
