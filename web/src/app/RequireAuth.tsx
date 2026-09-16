import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../features/auth/AuthProvider'

export function RequireAuth() {
  const { session, profile, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-mist/70">
        Carregando Balelagenda…
      </div>
    )
  }

  if (!session) return <Navigate to="/login" replace />

  if (!profile) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 text-center">
        <h1 className="font-display text-3xl">Sessão inválida</h1>
        <p className="mt-2 text-mist/70">
          Não foi possível carregar seu perfil. Faça login novamente. Se o login “funciona” mas
          volta aqui, confira se JWT_SECRET das Edge Functions = JWT Secret do projeto
          (Settings → API).
        </p>
      </div>
    )
  }

  if (!profile.active) return <Navigate to="/login" replace />

  return <Outlet />
}
