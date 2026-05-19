import { useState } from 'react'
import { useSpecStore } from '@/store/spec-store'
import { useNavigate } from 'react-router'
import { SearchDialog } from '../navigation/SearchDialog'
import { ProjectSelector } from './ProjectSelector'

const VIEWS = [
  { mode: 'doc', label: '文档', short: '文' },
  { mode: 'erd', label: 'ER 图', short: 'ER' },
  { mode: 'api', label: 'API', short: 'API' },
  { mode: 'graph', label: '图谱', short: '图' },
] as const

export function TopBar() {
  const sidebarOpen = useSpecStore(s => s.sidebarOpen)
  const setSidebarOpen = useSpecStore(s => s.setSidebarOpen)
  const [searchOpen, setSearchOpen] = useState(false)
  const viewMode = useSpecStore(s => s.viewMode)
  const setViewMode = useSpecStore(s => s.setViewMode)
  const navigate = useNavigate()

  return (
    <>
      <header className="topbar">
        <div className="topbar-brand">
          <div className="mark">S</div>
          Specs Viewer
        </div>

        <ProjectSelector />

        <div className="topbar-search" onClick={() => setSearchOpen(true)}>
          <span className="icon">🔍</span>
          <input type="text" placeholder="搜索文档、类型、表..." readOnly />
          <span className="kbd">⌘K</span>
        </div>

        <nav className="topbar-views">
          {VIEWS.map(v => (
            <button
              key={v.mode}
              className={viewMode === v.mode ? 'active' : ''}
              onClick={() => {
                setViewMode(v.mode as typeof viewMode)
                navigate(`/${v.mode === 'doc' ? '' : v.mode}`)
              }}
            >
              <span className="view-label-full">{v.label}</span>
              <span className="view-label-short">{v.short}</span>
            </button>
          ))}
        </nav>

        <div className="topbar-actions">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            title="切换侧边栏"
          >
            ☰
          </button>
        </div>
      </header>

      <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  )
}
