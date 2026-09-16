import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useCreateEvent, useDefaultGroupId, useEvents, useUpdateEvent } from '../lib/hooks'
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
  const { data: groupId } = useDefaultGroupId()
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
  })

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
      })
      setForm({ title: '', description: '', start_at: '', location_name: '', category: '', notes: '' })
      setOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível criar o evento.')
    }
  }

  const upcoming = events?.filter((ev) => ev.status !== 'cancelled') ?? []

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <PageTitle subtitle="Calendário compartilhado do grupo.">Agenda</PageTitle>
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
            {error && <div className="sm:col-span-2"><ErrorText>{error}</ErrorText></div>}
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
        {upcoming.map((ev) => (
          <li key={ev.id}>
            <Panel className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <Link to={`/agenda/${ev.id}`} className="font-display text-2xl text-foam hover:text-citrus">
                  {ev.title}
                </Link>
                <p className="text-sm text-mist/70">{formatWhen(ev.start_at)}</p>
                {ev.location_name && <p className="text-sm text-mist/50">{ev.location_name}</p>}
                <p className="flex flex-wrap items-center gap-1.5 text-xs text-mist/40">
                  <span>Status: {ev.status}</span>
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
                {ev.status !== 'cancelled' && (
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
        ))}
      </ul>
    </div>
  )
}
