#!/usr/bin/env node

import path from 'path'
import fs from 'fs'
import { startServer } from './server.js'
import { addProject, removeProject, listProjects, getRegistry } from './registry.js'
import { slugify } from './utils/slugify.js'
import { walkDir, detectSubdirs } from './utils/walk-dir.js'
import type { ProjectRegistryEntry } from './types.js'

const [,, command, ...args] = process.argv

function parseFlags(args: string[]): { positional: string[]; flags: Record<string, string> } {
  const positional: string[] = []
  const flags: Record<string, string> = {}

  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--') && i + 1 < args.length) {
      flags[args[i].slice(2)] = args[i + 1]
      i++
    } else if (args[i].startsWith('--')) {
      flags[args[i].slice(2)] = 'true'
    } else {
      positional.push(args[i])
    }
  }

  return { positional, flags }
}

function printHelp(): void {
  console.log(`
  spec-lens - Interactive specification document viewer

  Usage:
    spec-lens serve [--port <port>] [--open]
    spec-lens add <path> [--name <name>] [--slug <slug>]
    spec-lens remove <slug>
    spec-lens list

  Commands:
    serve    Start the viewer server
    add      Add a project (specify the docs directory path)
    remove   Remove a project from the registry
    list     List registered projects
  `)
}

async function runServe(positional: string[], flags: Record<string, string>): Promise<void> {
  const port = parseInt(flags.port ?? '3100', 10)
  const shouldOpen = flags.open === 'true'

  const registry = getRegistry()
  if (registry.projects.length === 0) {
    console.log('  No projects registered. Use "spec-lens add <path>" to add one.')
  }

  await startServer({ port })

  if (shouldOpen) {
    const opener = process.platform === 'darwin' ? 'open'
      : process.platform === 'win32' ? 'start'
      : 'xdg-open'
    import('child_process').then(cp => cp.exec(`${opener} http://localhost:${port}`))
  }

  // Keep process alive
  process.on('SIGINT', () => {
    console.log('\n  Shutting down...')
    process.exit(0)
  })
}

async function runAdd(positional: string[], flags: Record<string, string>): Promise<void> {
  const dirPath = positional[0]
  if (!dirPath) {
    console.error('  Error: Please specify a directory path.')
    console.error('  Usage: spec-lens add <path>')
    process.exit(1)
  }

  const absPath = path.resolve(dirPath)
  if (!fs.existsSync(absPath) || !fs.statSync(absPath).isDirectory()) {
    console.error(`  Error: "${absPath}" is not a valid directory.`)
    process.exit(1)
  }

  const files = walkDir(absPath)
  const subdirs = detectSubdirs(absPath)
  const basename = path.basename(absPath)

  const slug = flags.slug ?? slugify(basename)
  const name = flags.name ?? basename

  const entry: ProjectRegistryEntry = {
    slug,
    name,
    path: absPath,
    addedAt: new Date().toISOString(),
    source: 'cli',
  }

  const result = addProject(entry)
  console.log(`  Added project "${result.name}" (slug: ${result.slug})`)
  console.log(`  Path: ${absPath}`)
  console.log(`  Found ${files.size} document(s)${subdirs.length ? ` in ${subdirs.join(', ')}` : ''}`)
}

async function runRemove(positional: string[]): Promise<void> {
  const slug = positional[0]
  if (!slug) {
    console.error('  Error: Please specify a project slug.')
    console.error('  Usage: spec-lens remove <slug>')
    process.exit(1)
  }

  const found = removeProject(slug)
  if (found) {
    console.log(`  Removed project "${slug}"`)
  } else {
    console.error(`  Error: Project "${slug}" not found.`)
    process.exit(1)
  }
}

async function runList(): Promise<void> {
  const projects = listProjects()
  if (projects.length === 0) {
    console.log('  No projects registered.')
    return
  }

  console.log(`  ${'Slug'.padEnd(20)} ${'Name'.padEnd(20)} Path`)
  console.log(`  ${'─'.repeat(20)} ${'─'.repeat(20)} ${'─'.repeat(40)}`)
  for (const p of projects) {
    console.log(`  ${p.slug.padEnd(20)} ${p.name.padEnd(20)} ${p.path}`)
  }
}

// Main
switch (command) {
  case 'serve': {
    const { positional, flags } = parseFlags(args)
    runServe(positional, flags)
    break
  }
  case 'add': {
    const { positional, flags } = parseFlags(args)
    runAdd(positional, flags)
    break
  }
  case 'remove': {
    const { positional } = parseFlags(args)
    runRemove(positional)
    break
  }
  case 'list': {
    runList()
    break
  }
  default:
    printHelp()
}
