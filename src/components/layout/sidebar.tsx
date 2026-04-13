import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, FileText, FolderKanban, Wallet,
  CheckSquare, Receipt, BookOpen, Users, LogOut, Settings,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/auth-context'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/quotes', icon: FileText, label: 'Quotes' },
  { to: '/projects', icon: FolderKanban, label: 'Projects' },
  { to: '/finance', icon: Wallet, label: 'Finance' },
  { to: '/tasks', icon: CheckSquare, label: 'Tasks' },
  { to: '/expenses', icon: Receipt, label: 'Expenses' },
]

const secondaryItems = [
  { to: '/catalog', icon: BookOpen, label: 'Catalog' },
  { to: '/suppliers', icon: Users, label: 'Suppliers' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

export function Sidebar() {
  const { signOut, user } = useAuth()

  return (
    <aside className="fixed left-0 top-0 flex h-screen w-60 flex-col border-r border-sand/60 bg-white">
      {/* Brand */}
      <div className="flex items-center gap-3 px-6 py-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gold-dark text-white font-display font-bold text-lg">
          P
        </div>
        <div>
          <h1 className="font-display text-xl font-bold text-bark leading-none">Paperly</h1>
          <p className="text-[10px] font-medium uppercase tracking-widest text-muted">Studio</p>
        </div>
      </div>

      {/* Main nav */}
      <nav className="flex-1 px-3 py-2">
        <div className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-sand">
          Main
        </div>
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) => cn(
              'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150',
              isActive
                ? 'bg-cream-dark text-gold-dark'
                : 'text-muted hover:bg-cream hover:text-bark',
            )}
          >
            <item.icon size={18} />
            {item.label}
          </NavLink>
        ))}

        <div className="my-4 border-t border-sand/40" />

        <div className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-sand">
          Setup
        </div>
        {secondaryItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => cn(
              'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150',
              isActive
                ? 'bg-cream-dark text-gold-dark'
                : 'text-muted hover:bg-cream hover:text-bark',
            )}
          >
            <item.icon size={18} />
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* User / Sign out */}
      <div className="border-t border-sand/40 px-4 py-4">
        <div className="mb-2 truncate text-xs text-muted">{user?.email}</div>
        <button
          onClick={() => signOut()}
          className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-muted hover:bg-cream-dark hover:text-bark transition-colors"
        >
          <LogOut size={14} />
          Sign out
        </button>
      </div>
    </aside>
  )
}
