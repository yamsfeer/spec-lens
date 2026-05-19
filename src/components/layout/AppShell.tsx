import { Outlet } from 'react-router'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { StatusBar } from './StatusBar'
import { useSpecStore } from '@/store/spec-store'

export function AppShell() {
  const sidebarOpen = useSpecStore(s => s.sidebarOpen)

  return (
    <div className="app">
      <TopBar />
      <aside className={`sidebar ${sidebarOpen ? '' : 'collapsed'} ${sidebarOpen ? 'open' : ''}`}>
        <Sidebar />
      </aside>
      <main className="content">
        <Outlet />
      </main>
      <StatusBar />
    </div>
  )
}
