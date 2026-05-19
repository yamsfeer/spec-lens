import { create } from 'zustand'
import { parseProject } from '@/parse/pipeline'
import type { Project, ViewMode } from '@/parse/types'

let loadCounter = 0

interface SpecStore {
  project: Project | null
  loading: boolean
  error: string | null

  activeDoc: string | null
  activeSection: string | null
  sidebarOpen: boolean
  viewMode: ViewMode

  loadProject: (files: Map<string, string>, rootDir?: string) => Promise<void>
  loadProjectFromSlug: (slug: string) => Promise<void>
  setActiveDoc: (path: string | null) => void
  setActiveSection: (section: string | null) => void
  setSidebarOpen: (open: boolean) => void
  setViewMode: (mode: ViewMode) => void
  updateDocument: (path: string, content: string) => Promise<void>
  removeDocument: (path: string) => Promise<void>
}

export const useSpecStore = create<SpecStore>((set, get) => ({
  project: null,
  loading: false,
  error: null,
  activeDoc: null,
  activeSection: null,
  sidebarOpen: true,
  viewMode: 'doc',

  loadProject: async (files: Map<string, string>, rootDir?: string) => {
    set({ loading: true, error: null })
    try {
      const project = await parseProject(files)
      project.rootDir = rootDir ?? ''
      const firstDoc = project.documents.keys().next().value
      set({
        project,
        loading: false,
        activeDoc: firstDoc ?? null,
      })
    } catch (e) {
      set({ loading: false, error: (e as Error).message })
    }
  },

  loadProjectFromSlug: async (slug: string) => {
    const counter = ++loadCounter
    set({ loading: true, error: null })
    try {
      const res = await fetch(`/api/projects/${slug}/specs`)
      if (!res.ok) throw new Error(`Failed to fetch project: ${res.status}`)
      const data = await res.json()

      // Discard if a newer load was triggered
      if (counter !== loadCounter) return

      const files = new Map(Object.entries(data.files as Record<string, string>))
      const project = await parseProject(files)
      project.rootDir = data.rootDir ?? ''
      const firstDoc = project.documents.keys().next().value
      set({
        project,
        loading: false,
        activeDoc: firstDoc ?? null,
      })
    } catch (e) {
      if (counter !== loadCounter) return
      set({ loading: false, error: (e as Error).message })
    }
  },

  setActiveDoc: (path) => set({ activeDoc: path, activeSection: null }),

  setActiveSection: (section) => set({ activeSection: section }),

  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  setViewMode: (mode) => set({ viewMode: mode }),

  updateDocument: async (path: string, content: string) => {
    const { project } = get()
    if (!project) return

    const { parseDocument } = await import('@/parse/pipeline')
    const doc = await parseDocument(path, content)
    project.documents.set(path, doc)

    // Re-extract relations
    const {
      extractDocRefs,
    } = await import('@/parse/relations/doc-refs')
    const { extractERRelations } = await import('@/parse/relations/er-relations')
    const { extractTypeRelations } = await import('@/parse/relations/type-relations')
    const { extractTokenRelations } = await import('@/parse/relations/token-relations')
    const { extractMachineLinks } = await import('@/parse/relations/machine-links')

    project.relations = {
      docRefs: extractDocRefs(project.documents),
      erRelations: extractERRelations(project.documents),
      typeRelations: extractTypeRelations(project.documents),
      tokenRelations: extractTokenRelations(project.documents),
      machineLinks: extractMachineLinks(project.documents),
    }

    set({ project: { ...project } })
  },

  removeDocument: async (path: string) => {
    const { project } = get()
    if (!project) return

    project.documents.delete(path)

    const {
      extractDocRefs,
    } = await import('@/parse/relations/doc-refs')
    const { extractERRelations } = await import('@/parse/relations/er-relations')
    const { extractTypeRelations } = await import('@/parse/relations/type-relations')
    const { extractTokenRelations } = await import('@/parse/relations/token-relations')
    const { extractMachineLinks } = await import('@/parse/relations/machine-links')

    project.relations = {
      docRefs: extractDocRefs(project.documents),
      erRelations: extractERRelations(project.documents),
      typeRelations: extractTypeRelations(project.documents),
      tokenRelations: extractTokenRelations(project.documents),
      machineLinks: extractMachineLinks(project.documents),
    }

    if (get().activeDoc === path) {
      const firstDoc = project.documents.keys().next().value
      set({ project: { ...project }, activeDoc: firstDoc ?? null })
    } else {
      set({ project: { ...project } })
    }
  },
}))
