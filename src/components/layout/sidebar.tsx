import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, FileText, FolderKanban, Wallet,
  Receipt, BookOpen, Users, LogOut, Settings, Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/auth-context'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Tableau de bord' },
  { to: '/quotes', icon: FileText, label: 'Devis' },
  { to: '/calculator', icon: Sparkles, label: 'Pièces uniques' },
  { to: '/projects', icon: FolderKanban, label: 'Projets' },
  { to: '/finance', icon: Wallet, label: 'Finances' },
  { to: '/expenses', icon: Receipt, label: 'Dépenses' },
]

const secondaryItems = [
  { to: '/catalog', icon: BookOpen, label: 'Catalogue' },
  { to: '/suppliers', icon: Users, label: 'Fournisseurs' },
  { to: '/settings', icon: Settings, label: 'Réglages' },
]

const linkClass = ({ isActive }: { isActive: boolean }) => cn(
  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150',
  isActive ? 'bg-cream-dark text-gold-dark' : 'text-muted hover:bg-cream hover:text-bark',
)

interface SidebarProps {
  open: boolean
  onClose: () => void
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const { signOut, user } = useAuth()

  return (
    <>
      {/* Mobile backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-bark/30 backdrop-blur-sm lg:hidden"
          onClick={onClose}
          aria-hidden
        />
      )}

      <aside
        className={cn(
          'fixed left-0 top-0 z-50 flex h-screen w-60 flex-col border-r border-hairline bg-white',
          'transition-transform duration-200 lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex items-center gap-3 px-6 py-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gold-dark text-white font-display font-bold text-lg">P</div>
          <div>
            <h1 className="font-display text-xl font-bold text-bark leading-none">Paperly</h1>
            <p className="text-xs font-medium uppercase tracking-widest text-muted">Studio</p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-2">
          <div className="mb-2 px-3 text-xs font-semibold uppercase tracking-widest text-muted">Principal</div>
          {navItems.map(item => (
            <NavLink key={item.to} to={item.to} end={item.to === '/'} onClick={onClose} className={linkClass}>
              <item.icon size={18} />{item.label}
            </NavLink>
          ))}
          <div className="my-4 border-t border-hairline" />
          <div className="mb-2 px-3 text-xs font-semibold uppercase tracking-widest text-muted">Configuration</div>
          {secondaryItems.map(item => (
            <NavLink key={item.to} to={item.to} onClick={onClose} className={linkClass}>
              <item.icon size={18} />{item.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-hairline px-4 py-4">
          <div className="mb-2 truncate text-xs text-muted">{user?.email}</div>
          <button onClick={() => signOut()} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-muted hover:bg-cream-dark hover:text-bark transition-colors">
            <LogOut size={14} />Déconnexion
          </button>
        </div>
      </aside>
    </>
  )
}
