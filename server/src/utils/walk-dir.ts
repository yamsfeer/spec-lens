import fs from 'fs'
import path from 'path'

export function walkDir(rootDir: string): Map<string, string> {
  const files = new Map<string, string>()

  function walk(dir: string) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        walk(fullPath)
      } else if (entry.isFile() && /\.(md|markdown)$/i.test(entry.name)) {
        const relPath = path.relative(rootDir, fullPath).replace(/\\/g, '/')
        const content = fs.readFileSync(fullPath, 'utf-8')
        files.set(relPath, content)
      }
    }
  }

  walk(rootDir)
  return files
}

export function detectSubdirs(rootDir: string): string[] {
  const known = ['PRD', 'UIUX', 'architecture', 'contract']
  try {
    const entries = fs.readdirSync(rootDir, { withFileTypes: true })
    return entries
      .filter(e => e.isDirectory() && known.includes(e.name))
      .map(e => e.name)
  } catch {
    return []
  }
}
