import { useEffect, useId, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../features/auth/AuthProvider'
import { NotificationBell } from '../../features/notifications/NotificationBell'
import { RouteErrorBoundary } from '../RouteErrorBoundary'
import { UserAvatar } from '../UserAvatar'

const primaryLinkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-lg px-3 py-2 text-sm font-medium transition ${
    isActive ? 'bg-citrus text-ink' : 'text-mist/80 hover:bg-panel hover:text-foam'
  }`

const moreLinks = [
  { to: '/agenda', label: 'Lista de eventos' },
  { to: '/sugestoes', label: 'Sugestões' },
  { to: '/sorteio', label: 'Rolê aleatório' },
  { to: '/memorias', label: 'Memórias' },
  { to: '/estatisticas', label: 'Estatísticas' },
] as const

const morePaths = moreLinks.map((l) => l.to)

function useClickOutside(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (!open) return
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onCloseRef.current()
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onCloseRef.current()
    }
    document.addEventListener('mousedown', handle)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', handle)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])
  return ref
}

function MoreMenu({
  className = '',
  linkClass,
}: {
  className?: string
  linkClass: typeof primaryLinkClass
}) {
  const [open, setOpen] = useState(false)
  const location = useLocation()
  const menuId = useId()
  const ref = useClickOutside(open, () => setOpen(false))
  const active = morePaths.some(
    (p) => location.pathname === p || location.pathname.startsWith(`${p}/`),
  )

  useEffect(() => {
    setOpen(false)
  }, [location.pathname])

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
        className={linkClass({ isActive: active || open })}
      >
        Mais
        <span className="ml-1 opacity-70" aria-hidden>
          ▾
        </span>
      </button>
      {open && (
        <div
          id={menuId}
          role="menu"
          className="absolute bottom-full left-1/2 z-50 mb-2 w-48 -translate-x-1/2 rounded-xl border border-mist/15 bg-ink/98 p-1.5 shadow-[0_16px_40px_-20px_rgba(0,0,0,0.9)] backdrop-blur md:bottom-auto md:left-0 md:top-full md:mt-2 md:translate-x-0"
        >
          {moreLinks.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              role="menuitem"
              className={({ isActive }) =>
                `block rounded-lg px-3 py-2.5 text-sm transition ${
                  isActive ? 'bg-citrus/15 text-citrus' : 'text-mist/85 hover:bg-panel hover:text-foam'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  )
}

function UserMenu() {
  const { profile, isAdmin, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const location = useLocation()
  const menuId = useId()
  const ref = useClickOutside(open, () => setOpen(false))

  useEffect(() => {
    setOpen(false)
  }, [location.pathname])

  if (!profile) return null

  const firstName = profile.name.split(' ')[0]

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label="Menu do usuário"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-xl border border-mist/15 px-2 py-1.5 text-sm text-mist transition hover:border-citrus/40 hover:text-foam"
      >
        <UserAvatar name={profile.name} avatarPath={profile.avatar_path} size="sm" />
        <span className="hidden max-w-[8rem] truncate sm:inline">{firstName}</span>
        <span className="opacity-60" aria-hidden>
          ▾
        </span>
      </button>
      {open && (
        <div
          id={menuId}
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-48 rounded-xl border border-mist/15 bg-ink/98 p-1.5 shadow-[0_16px_40px_-20px_rgba(0,0,0,0.9)] backdrop-blur"
        >
          <p className="truncate px-3 py-2 text-xs text-mist/50">{profile.username}</p>
          <NavLink
            to="/perfil"
            role="menuitem"
            className={({ isActive }) =>
              `block rounded-lg px-3 py-2.5 text-sm transition ${
                isActive ? 'bg-citrus/15 text-citrus' : 'text-mist/85 hover:bg-panel hover:text-foam'
              }`
            }
          >
            Perfil
          </NavLink>
          {isAdmin && (
            <NavLink
              to="/admin"
              role="menuitem"
              className={({ isActive }) =>
                `block rounded-lg px-3 py-2.5 text-sm transition ${
                  isActive ? 'bg-citrus/15 text-citrus' : 'text-mist/85 hover:bg-panel hover:text-foam'
                }`
              }
            >
              Administração
            </NavLink>
          )}
          <button
            type="button"
            role="menuitem"
            onClick={() => void signOut()}
            className="w-full rounded-lg px-3 py-2.5 text-left text-sm text-coral/90 transition hover:bg-coral/10"
          >
            Sair
          </button>
        </div>
      )}
    </div>
  )
}

export function AppLayout() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-5xl flex-col px-4 pb-24 pt-6 md:pb-8">
      <header className="rise-in relative z-40 mb-6 flex items-end justify-between gap-4 md:mb-8">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-sky/80">agenda do rolê</p>
          <Link to="/" className="font-display text-4xl font-bold text-foam md:text-5xl">
            Balelagenda
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <NotificationBell />
          <UserMenu />
        </div>
      </header>

      <nav
        className="rise-in relative z-40 mb-6 hidden items-center gap-2 md:flex"
        aria-label="Principal"
      >
        <NavLink to="/" end className={primaryLinkClass}>
          Início
        </NavLink>
        <NavLink to="/ideias" className={primaryLinkClass}>
          Ideias
        </NavLink>
        <NavLink to="/grupo" className={primaryLinkClass}>
          Grupo
        </NavLink>
        <MoreMenu linkClass={primaryLinkClass} />
      </nav>

      <main className="rise-in relative z-0 flex-1">
        <RouteErrorBoundary>
          <Outlet />
        </RouteErrorBoundary>
      </main>

      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-mist/10 bg-ink/95 backdrop-blur md:hidden"
        aria-label="Mobile"
      >
        <div className="mx-auto grid max-w-5xl grid-cols-4 gap-1 px-2 py-2 text-center text-[11px]">
          <NavLink to="/" end className={primaryLinkClass}>
            Início
          </NavLink>
          <NavLink to="/ideias" className={primaryLinkClass}>
            Ideias
          </NavLink>
          <NavLink to="/grupo" className={primaryLinkClass}>
            Grupo
          </NavLink>
          <MoreMenu className="flex justify-center" linkClass={primaryLinkClass} />
        </div>
      </nav>
    </div>
  )
}
