import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../features/auth/AuthProvider'
import {
  canManageEvent,
  eventMarkerColor,
  useCreateEvent,
  useDefaultGroup,
  useDefaultGroupId,
  useEvents,
  useUpdateEvent,
} from '../lib/hooks'
import { dateKeyToLocalInput } from '../lib/dateUtils'
import type { EventScope } from '../types/database'
import {
  Button,
  EmptyState,
  ErrorText,
  Field,
  Input,
  PageTitle,
  Panel,
  TextArea,
} from '../components/ui/primitives'
import { UserAvatar } from '../components/UserAvatar'

function formatWhen(iso: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(iso))
}

export function AgendaPage() {
  const { profile } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const { data: groupId } = useDefaultGroupId()
  const { data: group } = useDefaultGroup()
  const { data: events, isLoading } = useEvents(groupId)
  const createEvent = useCreateEvent()
  const updateEvent = useUpdateEvent()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    title: '',
    description: '',
    start_at: '',
    location_name: '',
    category: '',
    notes: '',
    scope: 'individual' as EventScope,
  })

  useEffect(() => {
    const date = searchParams.get('date')
    const wantNew = searchParams.get('new') === '1'
    if (!date && !wantNew) return
    const start = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? dateKeyToLocalInput(date) : ''
    setOpen(true)
    if (start) setForm((f) => ({ ...f, start_at: start }))
    setSearchParams({}, { replace: true })
  }, [searchParams, setSearchParams])

  async function onCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!groupId) return
    setError(null)
    try {
      await createEvent.mutateAsync({
        group_id: groupId,
        title: form.title,
        description: form.description || undefined,
        start_at: new Date(form.start_at).toISOString(),
        location_name: form.location_name || undefined,
        category: form.category || undefined,
        notes: form.notes || undefined,
        scope: form.scope,
      })
      setForm({
        title: '',
        description: '',
        start_at: '',
        location_name: '',
        category: '',
        notes: '',
        scope: 'individual',
      })
      setOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível criar o evento.')
    }
  }

  const upcoming = events?.filter((ev) => ev.status !== 'cancelled') ?? []

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <PageTitle subtitle="Lista de todos os rolês do grupo. O calendário fica no Início.">
          Agenda
        </PageTitle>
        <Button type="button" onClick={() => setOpen((v) => !v)}>
          {open ? 'Fechar' : 'Novo evento'}
        </Button>
      </div>

      {open && (
        <Panel>
          <form className="grid gap-3 sm:grid-cols-2" onSubmit={onCreate}>
            <div className="sm:col-span-2">
              <Field label="Título">
                <Input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  required
                />
              </Field>
            </div>
            <Field label="Tipo">
              <select
                className="w-full rounded-xl border border-mist/15 bg-panel px-3 py-2.5 text-foam"
                value={form.scope}
                onChange={(e) => setForm((f) => ({ ...f, scope: e.target.value as EventScope }))}
              >
                <option value="individual">Compromisso individual</option>
                <option value="group">Evento de grupo</option>
              </select>
            </Field>
            <Field label="Data e horário">
              <Input
                type="datetime-local"
                value={form.start_at}
                onChange={(e) => setForm((f) => ({ ...f, start_at: e.target.value }))}
                required
              />
            </Field>
            <Field label="Local">
              <Input
                value={form.location_name}
                onChange={(e) => setForm((f) => ({ ...f, location_name: e.target.value }))}
              />
            </Field>
            <Field label="Categoria">
              <Input
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Descrição">
                <TextArea
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                />
              </Field>
            </div>
            {error && (
              <div className="sm:col-span-2">
                <ErrorText>{error}</ErrorText>
              </div>
            )}
            <div className="sm:col-span-2">
              <Button type="submit" disabled={createEvent.isPending}>
                {createEvent.isPending ? 'Salvando…' : 'Criar evento'}
              </Button>
            </div>
          </form>
        </Panel>
      )}

      {isLoading && <p className="text-mist/60">Carregando agenda…</p>}
      {!isLoading && upcoming.length === 0 && (
        <EmptyState title="Nenhum evento marcado ainda." hint="Que tal criar o primeiro?" />
      )}

      <ul className="space-y-3">
        {upcoming.map((ev) => {
          const manageable = canManageEvent(ev, profile)
          const color = eventMarkerColor(ev, group?.calendar_color)
          return (
            <li key={ev.id}>
              <Panel className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <Link
                    to={`/agenda/${ev.id}`}
                    className="inline-flex items-center gap-2 font-display text-2xl text-foam hover:text-citrus"
                  >
                    <span
                      className="h-3 w-3 shrink-0 rounded-full"
                      style={{ backgroundColor: color }}
                      aria-hidden
                    />
                    {ev.title}
                  </Link>
                  <p className="text-sm text-mist/70">{formatWhen(ev.start_at)}</p>
                  {ev.location_name && <p className="text-sm text-mist/50">{ev.location_name}</p>}
                  <p className="flex flex-wrap items-center gap-1.5 text-xs text-mist/40">
                    <span>Status: {ev.status}</span>
                    <span>·</span>
                    <span>{ev.scope === 'group' ? 'Grupo' : 'Individual'}</span>
                    {ev.profiles && (
                      <>
                        <span>·</span>
                        <UserAvatar
                          name={ev.profiles.name}
                          avatarPath={ev.profiles.avatar_path}
                          size="xs"
                        />
                        <span>por {ev.profiles.name}</span>
                      </>
                    )}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Link to={`/agenda/${ev.id}`}>
                    <Button variant="ghost">Abrir</Button>
                  </Link>
                  {manageable && ev.status !== 'cancelled' && (
                    <Button
                      variant="danger"
                      type="button"
                      onClick={() => void updateEvent.mutateAsync({ id: ev.id, status: 'cancelled' })}
                    >
                      Cancelar
                    </Button>
                  )}
                </div>
              </Panel>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
