// ── Project Registry ──

export interface ProjectRegistryEntry {
  slug: string
  name: string
  path: string
  addedAt: string
  source: 'cli'
}

export interface ProjectRegistry {
  version: 1
  projects: ProjectRegistryEntry[]
}

// ── SSE Events ──

export type SSEEvent =
  | { type: 'change'; path: string; content: string }
  | { type: 'add'; path: string; content: string }
  | { type: 'unlink'; path: string }
  | { type: 'error'; message: string }

// ── API Responses ──

export interface ProjectListResponse {
  projects: ProjectRegistryEntry[]
}

export interface ProjectSpecsResponse {
  slug: string
  rootDir: string
  files: Record<string, string>
}
