import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../features/auth/AuthProvider'
import { adminCreateUser, adminSetPassword } from '../features/auth/authService'
import { useProfilesAdmin, useUpdateProfileAdmin } from '../lib/hooks'
import type { UserRole } from '../types/database'
import {
  Button,
  ErrorText,
  Field,
  Input,
  PageTitle,
  Panel,
} from '../components/ui/primitives'
import { UserAvatar } from '../components/UserAvatar'

export function AdminPage() {
  const { isAdmin } = useAuth()
  const { data: profiles, isLoading, refetch } = useProfilesAdmin()
  const updateProfile = useUpdateProfileAdmin()
  const [form, setForm] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
    role: 'user' as UserRole,
  })
  const [resetPassword, setResetPassword] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [okMsg, setOkMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (!isAdmin) return <Navigate to="/" replace />

  async function onCreate(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setOkMsg(null)
    setBusy(true)
    try {
      await adminCreateUser({
        name: form.name,
        username: form.username,
        email: form.email.trim() || null,
        password: form.password,
        role: form.role,
      })
      setForm({ name: '', username: '', email: '', password: '', role: 'user' })
      setOkMsg('Usuário criado.')
      await refetch()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao criar usuário')
    } finally {
      setBusy(false)
    }
  }

  async function onResetPassword(userId: string) {
    const password = (resetPassword[userId] ?? '').trim()
    setError(null)
    setOkMsg(null)
    try {
      await adminSetPassword(userId, password)
      setResetPassword((m) => ({ ...m, [userId]: '' }))
      setOkMsg('Senha atualizada.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao redefinir senha')
    }
  }

  return (
    <div className="space-y-6">
      <PageTitle subtitle="Somente administradores. Senhas são hasheadas nas Edge Functions — nunca em plaintext.">
        Administração
      </PageTitle>

      <Panel>
        <h2 className="font-display text-2xl">Novo usuário</h2>
        <form className="mt-3 grid gap-3 sm:grid-cols-2" onSubmit={onCreate}>
          <Field label="Nome">
            <Input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
          </Field>
          <Field label="Username">
            <Input
              value={form.username}
              onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
              required
              autoComplete="off"
            />
          </Field>
          <Field label="E-mail (opcional)">
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
          </Field>
          <Field label="Senha inicial">
            <Input
              type="password"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </Field>
          <Field label="Perfil">
            <select
              className="w-full rounded-xl border border-mist/15 bg-panel px-3 py-2.5 text-foam"
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as UserRole }))}
            >
              <option value="user">Usuário</option>
              <option value="admin">Admin</option>
            </select>
          </Field>
          {error && (
            <div className="sm:col-span-2">
              <ErrorText>{error}</ErrorText>
            </div>
          )}
          {okMsg && (
            <p className="sm:col-span-2 text-sm text-citrus">{okMsg}</p>
          )}
          <div className="sm:col-span-2">
            <Button type="submit" disabled={busy}>
              {busy ? 'Criando…' : 'Criar usuário'}
            </Button>
          </div>
        </form>
      </Panel>

      <Panel>
        <h2 className="mb-3 font-display text-2xl">Usuários</h2>
        {isLoading && <p className="text-mist/60">Carregando…</p>}
        <ul className="space-y-3">
          {profiles?.map((p) => (
            <li
              key={p.id}
              className="flex flex-col gap-3 rounded-xl border border-mist/10 p-3"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <UserAvatar name={p.name} avatarPath={p.avatar_path} size="md" />
                  <div>
                    <p className="font-medium">{p.name}</p>
                    <p className="text-sm text-mist/60">
                      @{p.username} · {p.role} · {p.active ? 'Ativo' : 'Inativo'}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {p.active ? (
                    <Button
                      type="button"
                      variant="danger"
                      onClick={() => void updateProfile.mutateAsync({ id: p.id, active: false })}
                    >
                      Desativar
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      onClick={() => void updateProfile.mutateAsync({ id: p.id, active: true })}
                    >
                      Reativar
                    </Button>
                  )}
                  {p.role === 'user' ? (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => void updateProfile.mutateAsync({ id: p.id, role: 'admin' })}
                    >
                      Tornar admin
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => void updateProfile.mutateAsync({ id: p.id, role: 'user' })}
                    >
                      Remover admin
                    </Button>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                <div className="min-w-0 flex-1">
                  <Field label="Nova senha">
                    <Input
                      type="password"
                      value={resetPassword[p.id] ?? ''}
                      onChange={(e) =>
                        setResetPassword((m) => ({ ...m, [p.id]: e.target.value }))
                      }
                      minLength={8}
                      autoComplete="new-password"
                      placeholder="Mín. 8 caracteres"
                    />
                  </Field>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={(resetPassword[p.id] ?? '').length < 8}
                  onClick={() => void onResetPassword(p.id)}
                >
                  Redefinir senha
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  )
}
