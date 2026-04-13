import { Outlet } from 'react-router-dom'
import { Sidebar } from './sidebar'

export function AppLayout() {
  return (
    <div className="flex min-h-screen bg-cream">
      <Sidebar />
      <main className="ml-60 flex-1 p-8">
        <div className="mx-auto max-w-6xl">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
