import { useRef, useCallback } from 'react'
import { Outlet } from 'react-router'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { StatusBar } from './StatusBar'
import { Breadcrumb } from '../navigation/Breadcrumb'
import { useSpecStore } from '@/store/spec-store'
import { PanelLeft } from 'lucide-react'

export function AppShell() {
  const sidebarOpen = useSpecStore(s => s.sidebarOpen)
  const setSidebarOpen = useSpecStore(s => s.setSidebarOpen)
  const sidebarWidth = useSpecStore(s => s.sidebarWidth)
  const setSidebarWidth = useSpecStore(s => s.setSidebarWidth)
  const activeDoc = useSpecStore(s => s.activeDoc)
  const isDragging = useRef(false)

  const onResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    isDragging.current = true
    const startX = e.clientX
    const startWidth = sidebarWidth

    const onMouseMove = (ev: MouseEvent) => {
      if (!isDragging.current) return
      const delta = ev.clientX - startX
      setSidebarWidth(startWidth + delta)
    }
    const onMouseUp = () => {
      isDragging.current = false
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }, [sidebarWidth, setSidebarWidth])

  return (
    <div className="app">
      <TopBar />
      {sidebarOpen && <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />}
      <div className="sidebar-wrapper" style={{ width: sidebarOpen ? sidebarWidth : 0 }}>
        <aside className={`sidebar ${sidebarOpen ? 'open' : 'collapsed'}`}>
          <div className="sidebar-header">
            <span>specs</span>
          </div>
          <Sidebar />
        </aside>
        {sidebarOpen && (
          <div
            className="sidebar-resize-handle"
            onMouseDown={onResizeStart}
          />
        )}
      </div>
      <main className="content">
        <div className="content-topbar">
          <button
            className="sidebar-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            title={sidebarOpen ? '收起侧边栏' : '展开侧边栏'}
          >
            <PanelLeft size={15} />
          </button>
          {activeDoc && <Breadcrumb path={activeDoc} />}
        </div>
        <div className="content-body">
          <Outlet />
        </div>
      </main>
      <StatusBar />
    </div>
  )
}
