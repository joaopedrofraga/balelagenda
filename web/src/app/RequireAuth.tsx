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
        <h1 className="font-display text-3xl">Perfil incompleto</h1>
        <p className="mt-2 text-mist/70">
          Sua conta Auth existe, mas não há perfil ativo. Use um convite válido ou peça ao admin para
          completar o bootstrap no Supabase.
        </p>
      </div>
    )
  }

  if (!profile.active) return <Navigate to="/login" replace />

  return <Outlet />
}
