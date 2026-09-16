import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { signupWithInvite } from './authService'
import { Button, ErrorText, Field, Input, Panel } from '../../components/ui/primitives'

export function SignupPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [token, setToken] = useState(params.get('token') ?? '')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [preview, setPreview] = useState<{ name: string; username: string; email: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!token) {
      setPreview(null)
      return
    }
    void supabase.rpc('get_invite_by_token', { p_token: token }).then(({ data, error: err }) => {
      if (err) {
        setPreview(null)
        return
      }
      const row = Array.isArray(data) ? data[0] : data
      if (row) {
        setPreview({ name: row.name, username: row.username, email: row.email })
        setEmail(row.email)
      } else {
        setPreview(null)
      }
    })
  }, [token])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await signupWithInvite({ token, email, password })
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha no cadastro')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-10">
      <div className="mb-6 text-center">
        <h1 className="font-display text-4xl font-bold">Criar acesso</h1>
        <p className="text-sm text-mist/70">Somente com convite de um administrador.</p>
      </div>
      <Panel>
        <form className="space-y-4" onSubmit={onSubmit}>
          <Field label="Token do convite">
            <Input value={token} onChange={(e) => setToken(e.target.value)} required />
          </Field>
          {preview && (
            <p className="rounded-xl bg-ink/40 px-3 py-2 text-sm text-mist">
              Convite para <strong className="text-foam">{preview.name}</strong> (@{preview.username})
            </p>
          )}
          <Field label="E-mail">
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </Field>
          <Field label="Senha">
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
            />
          </Field>
          {error && <ErrorText>{error}</ErrorText>}
          <Button type="submit" className="w-full" disabled={busy || !preview}>
            {busy ? 'Criando…' : 'Entrar no Balelagenda'}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm">
          <Link className="text-citrus underline" to="/login">
            Voltar ao login
          </Link>
        </p>
      </Panel>
    </div>
  )
}
