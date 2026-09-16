import { Link, NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../../features/auth/AuthProvider'
import { NotificationBell } from '../../features/notifications/NotificationBell'
import { UserAvatar } from '../UserAvatar'

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-lg px-3 py-2 text-sm font-medium transition ${
    isActive ? 'bg-citrus text-ink' : 'text-mist/80 hover:bg-panel hover:text-foam'
  }`

export function AppLayout() {
  const { profile, isAdmin, signOut } = useAuth()

  return (
    <div className="mx-auto flex min-h-dvh max-w-5xl flex-col px-4 pb-24 pt-6 md:pb-8">
      <header className="rise-in mb-8 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-sky/80">agenda do rolê</p>
          <Link to="/" className="font-display text-4xl font-bold text-foam md:text-5xl">
            Balelagenda
          </Link>
          {profile && (
            <Link
              to="/perfil"
              className="mt-2 inline-flex items-center gap-2 text-sm text-mist/70 hover:text-foam"
            >
              <UserAvatar name={profile.name} avatarPath={profile.avatar_path} size="sm" />
              <span>Olá, {profile.name.split(' ')[0]}</span>
            </Link>
          )}
        </div>
        <div className="flex items-center gap-2">
          <NotificationBell />
          <button
            type="button"
            onClick={() => void signOut()}
            className="rounded-lg border border-mist/20 px-3 py-2 text-sm text-mist hover:border-coral hover:text-coral"
          >
            Sair
          </button>
        </div>
      </header>

      <nav className="rise-in mb-6 hidden flex-wrap gap-2 md:flex">
        <NavLink to="/" end className={linkClass}>
          Início
        </NavLink>
        <NavLink to="/agenda" className={linkClass}>
          Agenda
        </NavLink>
        <NavLink to="/ideias" className={linkClass}>
          Ideias
        </NavLink>
        <NavLink to="/sorteio" className={linkClass}>
          Rolê aleatório
        </NavLink>
        <NavLink to="/sugestoes" className={linkClass}>
          Sugestões
        </NavLink>
        <NavLink to="/memorias" className={linkClass}>
          Memórias
        </NavLink>
        <NavLink to="/estatisticas" className={linkClass}>
          Estatísticas
        </NavLink>
        <NavLink to="/grupo" className={linkClass}>
          Grupo
        </NavLink>
        <NavLink to="/perfil" className={linkClass}>
          Perfil
        </NavLink>
        <NavLink to="/notificacoes" className={linkClass}>
          Avisos
        </NavLink>
        {isAdmin && (
          <NavLink to="/admin" className={linkClass}>
            Administração
          </NavLink>
        )}
      </nav>

      <main className="rise-in flex-1">
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-mist/10 bg-ink/95 backdrop-blur md:hidden">
        <div className="mx-auto grid max-w-5xl grid-cols-5 gap-1 px-2 py-2 text-center text-[11px]">
          <NavLink to="/" end className={linkClass}>
            Início
          </NavLink>
          <NavLink to="/agenda" className={linkClass}>
            Agenda
          </NavLink>
          <NavLink to="/estatisticas" className={linkClass}>
            Stats
          </NavLink>
          <NavLink to="/perfil" className={linkClass}>
            Perfil
          </NavLink>
          <NavLink to={isAdmin ? '/admin' : '/grupo'} className={linkClass}>
            {isAdmin ? 'Admin' : 'Grupo'}
          </NavLink>
        </div>
      </nav>
    </div>
  )
}
