import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router'
import { AppShell } from './components/layout/AppShell'
import { DocPage } from './pages/DocPage'
import { ERDPage } from './pages/ERDPage'
import { APIPage } from './pages/APIPage'
import { DesignTokenPage } from './pages/DesignTokenPage'
import { StateMachinePage } from './pages/StateMachinePage'
import { GraphPage } from './pages/GraphPage'
import { useSpecStore } from './store/spec-store'
import { useProjectsStore } from './store/projects-store'
import { disconnectSSE } from './store/sse'

export function App() {
  const project = useSpecStore(s => s.project)
  const loading = useSpecStore(s => s.loading)
  const projects = useProjectsStore(s => s.projects)
  const fetchProjects = useProjectsStore(s => s.fetchProjects)
  const switchProject = useProjectsStore(s => s.switchProject)

  useEffect(() => {
    fetchProjects().then(() => {
      const state = useProjectsStore.getState()
      if (state.projects.length === 0) return

      const urlSlug = new URLSearchParams(window.location.search).get('project')
      const target = urlSlug && state.projects.some(p => p.slug === urlSlug)
        ? urlSlug
        : state.projects[0]?.slug

      if (target) switchProject(target)
    })

    return () => {
      disconnectSSE()
    }
  }, [fetchProjects, switchProject])

  if (projects.length === 0 && !loading) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg)',
        color: 'var(--fg-2)',
        font: '15px/1.6 var(--font-body)',
        textAlign: 'center',
      }}>
        <div>
          <div style={{ fontSize: '2em', marginBottom: '1rem' }}>📂</div>
          <div style={{ marginBottom: '0.5rem' }}>暂无项目</div>
          <div style={{ fontSize: '13px', color: 'var(--fg-3)' }}>
            使用 <code style={{ background: 'var(--bg-2)', padding: '2px 6px', borderRadius: '4px' }}>
            spec-lens add &lt;path&gt;</code> 添加项目
          </div>
        </div>
      </div>
    )
  }

  if (!project) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg)',
        color: 'var(--fg-2)',
        font: '15px/1.6 var(--font-body)',
      }}>
        Loading specs...
      </div>
    )
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<Navigate to="/doc" replace />} />
          <Route path="doc/*" element={<DocPage />} />
          <Route path="erd" element={<ERDPage />} />
          <Route path="api" element={<APIPage />} />
          <Route path="design-tokens" element={<DesignTokenPage />} />
          <Route path="state-machines" element={<StateMachinePage />} />
          <Route path="graph" element={<GraphPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
