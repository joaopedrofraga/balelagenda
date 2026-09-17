import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { loginWithIdentifier } from './authService'
import { useAuth } from './AuthProvider'
import { Button, ErrorText, Field, Input, Panel } from '../../components/ui/primitives'

export function LoginPage() {
  const { session, profile, loading, acceptSession } = useAuth()
  const navigate = useNavigate()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // Exige profile: session sozinha não autentica (token pode ter falhado no PostgREST).
  if (!loading && session && profile) return <Navigate to="/" replace />

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    e.stopPropagation()
    setBusy(true)
    setError(null)
    try {
      await loginWithIdentifier(identifier, password)
      await acceptSession()
      navigate('/', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha no login')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-10">
      <div className="rise-in mb-8 text-center">
        <img
          src="/logo.png"
          alt=""
          width={72}
          height={72}
          className="mx-auto mb-3 h-[72px] w-[72px]"
          style={{ imageRendering: 'pixelated' }}
        />
        <p className="text-xs uppercase tracking-[0.25em] text-sky/80">bem-vindo</p>
        <h1 className="font-display text-5xl font-bold text-foam">Balelagenda</h1>
        <p className="mt-2 text-mist/70">A agenda social do grupo — sem espalhar no WhatsApp.</p>
      </div>
      <Panel className="rise-in">
        <form className="space-y-4" onSubmit={onSubmit}>
          <Field label="Username ou e-mail">
            <Input
              autoComplete="username"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
            />
          </Field>
          <Field label="Senha">
            <Input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </Field>
          {error && <ErrorText>{error}</ErrorText>}
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? 'Entrando…' : 'Entrar'}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-mist/60">
          Contas são criadas pelo administrador do grupo.
        </p>
      </Panel>
    </div>
  )
}
