import { create } from 'zustand'
import type { ProjectMeta } from '@/parse/types'
import { useSpecStore } from './spec-store'
import { buildSearchIndex } from './search-index'
import { connectSSE, disconnectSSE } from './sse'

interface ProjectsStore {
  projects: ProjectMeta[]
  currentSlug: string | null
  loading: boolean
  error: string | null

  fetchProjects: () => Promise<void>
  switchProject: (slug: string) => Promise<void>
  removeProject: (slug: string) => Promise<void>
}

export const useProjectsStore = create<ProjectsStore>((set, get) => ({
  projects: [],
  currentSlug: null,
  loading: false,
  error: null,

  fetchProjects: async () => {
    set({ loading: true, error: null })
    try {
      const res = await fetch('/api/projects')
      const data = await res.json()
      set({ projects: data.projects, loading: false })
    } catch (e) {
      set({ loading: false, error: (e as Error).message })
    }
  },

  switchProject: async (slug: string) => {
    const { projects } = get()
    if (!projects.some(p => p.slug === slug)) return

    set({ currentSlug: slug })
    disconnectSSE()

    try {
      await useSpecStore.getState().loadProjectFromSlug(slug)
      const project = useSpecStore.getState().project
      if (project) {
        buildSearchIndex(project.documents)
      }
      connectSSE(slug)
    } catch (e) {
      console.error('Failed to switch project:', e)
    }
  },

  removeProject: async (slug: string) => {
    const { currentSlug } = get()
    const res = await fetch(`/api/projects/${slug}`, { method: 'DELETE' })
    if (!res.ok && res.status !== 204) return

    const { projects } = get()
    const updated = projects.filter(p => p.slug !== slug)
    set({ projects: updated })

    if (currentSlug === slug) {
      disconnectSSE()
      set({ currentSlug: null })
      if (updated.length > 0 && updated[0]) {
        get().switchProject(updated[0].slug)
      }
    }
  },
}))
