import fs from 'fs'
import path from 'path'
import os from 'os'
import type { ProjectRegistry, ProjectRegistryEntry } from './types.js'

const REGISTRY_DIR = path.join(os.homedir(), '.spec-lens')
const REGISTRY_PATH = path.join(REGISTRY_DIR, 'projects.json')

function ensureRegistryFile(): void {
  if (!fs.existsSync(REGISTRY_DIR)) {
    fs.mkdirSync(REGISTRY_DIR, { recursive: true })
  }
  if (!fs.existsSync(REGISTRY_PATH)) {
    fs.writeFileSync(REGISTRY_PATH, JSON.stringify({ version: 1, projects: [] }, null, 2), 'utf-8')
  }
}

export function getRegistry(): ProjectRegistry {
  ensureRegistryFile()
  const raw = fs.readFileSync(REGISTRY_PATH, 'utf-8')
  return JSON.parse(raw) as ProjectRegistry
}

export function saveRegistry(registry: ProjectRegistry): void {
  ensureRegistryFile()
  const tmp = REGISTRY_PATH + '.tmp'
  fs.writeFileSync(tmp, JSON.stringify(registry, null, 2), 'utf-8')
  fs.renameSync(tmp, REGISTRY_PATH)
}

export function addProject(entry: ProjectRegistryEntry): ProjectRegistryEntry {
  const registry = getRegistry()
  if (registry.projects.some(p => p.slug === entry.slug)) {
    // Append suffix on collision
    let i = 2
    while (registry.projects.some(p => p.slug === `${entry.slug}-${i}`)) i++
    entry.slug = `${entry.slug}-${i}`
  }
  registry.projects.push(entry)
  saveRegistry(registry)
  return entry
}

export function removeProject(slug: string): boolean {
  const registry = getRegistry()
  const idx = registry.projects.findIndex(p => p.slug === slug)
  if (idx === -1) return false
  registry.projects.splice(idx, 1)
  saveRegistry(registry)
  return true
}

export function getProject(slug: string): ProjectRegistryEntry | undefined {
  const registry = getRegistry()
  return registry.projects.find(p => p.slug === slug)
}

export function listProjects(): ProjectRegistryEntry[] {
  return getRegistry().projects
}
