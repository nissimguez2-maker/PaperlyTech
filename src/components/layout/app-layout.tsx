import { Outlet } from 'react-router-dom'
import { useState } from 'react'
import { Menu } from 'lucide-react'
import { Sidebar } from './sidebar'

export function AppLayout() {
  const [navOpen, setNavOpen] = useState(false)

  return (
    <div className="min-h-screen bg-cream">
      <Sidebar open={navOpen} onClose={() => setNavOpen(false)} />

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-hairline bg-white/90 px-4 py-3 backdrop-blur lg:hidden">
        <button
          onClick={() => setNavOpen(true)}
          aria-label="Ouvrir le menu"
          className="rounded-lg p-2 text-bark hover:bg-cream-dark transition-colors"
        >
          <Menu size={20} />
        </button>
        <span className="font-display text-lg font-bold text-bark">Paperly</span>
      </header>

      <main className="px-4 py-6 lg:ml-60 lg:px-10 lg:py-10">
        <div className="mx-auto max-w-6xl">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
