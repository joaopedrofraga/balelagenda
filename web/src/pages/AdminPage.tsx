import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../features/auth/AuthProvider'
import {
  useCreateInvite,
  useInvites,
  useProfilesAdmin,
  useUpdateProfileAdmin,
} from '../lib/hooks'
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
  const { data: profiles, isLoading } = useProfilesAdmin()
  const { data: invites } = useInvites()
  const updateProfile = useUpdateProfileAdmin()
  const createInvite = useCreateInvite()
  const [form, setForm] = useState({ name: '', username: '', email: '', role: 'user' as UserRole })
  const [lastToken, setLastToken] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (!isAdmin) return <Navigate to="/" replace />

  async function onInvite(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      const invite = await createInvite.mutateAsync(form)
      setLastToken(invite.token)
      setForm({ name: '', username: '', email: '', role: 'user' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao criar convite')
    }
  }

  return (
    <div className="space-y-6">
      <PageTitle subtitle="Somente administradores. A segurança real está nas policies RLS.">
        Administração
      </PageTitle>

      <Panel>
        <h2 className="font-display text-2xl">Novo convite</h2>
        <form className="mt-3 grid gap-3 sm:grid-cols-2" onSubmit={onInvite}>
          <Field label="Nome">
            <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
          </Field>
          <Field label="Username">
            <Input value={form.username} onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))} required />
          </Field>
          <Field label="E-mail">
            <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} required />
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
          {error && <div className="sm:col-span-2"><ErrorText>{error}</ErrorText></div>}
          <div className="sm:col-span-2">
            <Button type="submit" disabled={createInvite.isPending}>
              Criar convite
            </Button>
          </div>
        </form>
        {lastToken && (
          <p className="mt-3 break-all rounded-xl bg-ink/50 p-3 text-sm text-citrus">
            Token: {lastToken}
            <br />
            Link: {window.location.origin}/signup?token={lastToken}
          </p>
        )}
      </Panel>

      <Panel>
        <h2 className="mb-3 font-display text-2xl">Usuários</h2>
        {isLoading && <p className="text-mist/60">Carregando…</p>}
        <ul className="space-y-3">
          {profiles?.map((p) => (
            <li key={p.id} className="flex flex-col gap-2 rounded-xl border border-mist/10 p-3 sm:flex-row sm:items-center sm:justify-between">
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
            </li>
          ))}
        </ul>
      </Panel>

      <Panel>
        <h2 className="mb-3 font-display text-2xl">Convites</h2>
        <ul className="space-y-2 text-sm">
          {invites?.map((i) => (
            <li key={i.id} className="rounded-lg bg-ink/40 px-3 py-2">
              {i.name} · {i.email} · {i.used_at ? 'usado' : 'pendente'} · token {i.token.slice(0, 8)}…
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  )
}
