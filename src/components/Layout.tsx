import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { Home, Search, LogOut, ShieldCheck, Star, PenSquare } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { CommandPalette } from './CommandPalette'

export function Layout() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  async function handleLogout() {
    await signOut()
    navigate('/login')
  }

  function navClass(path: string) {
    const active = path === '/' ? location.pathname === '/' : location.pathname.startsWith(path)
    return `flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
      active ? 'bg-accent/15 text-accent font-bold' : 'hover:bg-neutral-800 text-neutral-300'
    }`
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row text-neutral-100">
      <aside className="md:w-64 md:h-screen md:sticky md:top-0 border-b md:border-b-0 md:border-r border-neutral-800/80 bg-neutral-950/60 backdrop-blur p-4 flex md:flex-col gap-2">
        <Link to="/" className="flex items-center gap-2 mb-5">
          <img src={`${import.meta.env.BASE_URL}logo.png`} alt="" className="w-8 h-8 object-contain" />
          <span className="font-bold leading-tight text-sm">
            Museum Wiki
            <div className="text-[10px] font-normal text-neutral-500">Technik-Wissen</div>
          </span>
        </Link>

        {(profile?.role === 'admin' || profile?.role === 'technician') && (
          <Link
            to="/new-guide"
            className="flex items-center gap-2 px-3 py-2.5 mb-3 rounded-lg text-sm font-bold bg-accent hover:bg-accent-dark text-white shadow-lg shadow-accent/20 transition-colors"
          >
            <PenSquare size={16} /> Neue Anleitung
          </Link>
        )}

        <nav className="flex md:flex-col gap-1 flex-1">
          <Link to="/" className={navClass('/')}>
            <Home size={16} /> Startseite
          </Link>
          <Link to="/search" className={navClass('/search')}>
            <Search size={16} /> Suche
            <span className="ml-auto text-[10px] text-neutral-600 hidden md:inline">⌘K</span>
          </Link>
          <Link to="/favorites" className={navClass('/favorites')}>
            <Star size={16} /> Favoriten
          </Link>
          {(profile?.role === 'admin' || profile?.role === 'technician') && (
            <Link to="/admin" className={navClass('/admin')}>
              <ShieldCheck size={16} /> Verwaltung
            </Link>
          )}
        </nav>
        <div className="mt-auto pt-4 border-t border-neutral-800/80 text-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-accent/20 text-accent flex items-center justify-center font-bold text-xs">
              {(profile?.full_name || profile?.email || '?').slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-neutral-300 truncate text-xs font-bold">{profile?.full_name || profile?.email}</p>
              <p className="text-[10px] text-neutral-500 capitalize">{profile?.role}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-neutral-800 text-sm w-full text-neutral-400"
          >
            <LogOut size={16} /> Abmelden
          </button>
        </div>
      </aside>
      <main className="flex-1 p-4 md:p-8 max-w-4xl mx-auto w-full fade-in">
        <Outlet />
      </main>
      <CommandPalette />
    </div>
  )
}
