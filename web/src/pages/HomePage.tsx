import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { MonthCalendar } from '../components/MonthCalendar'
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
import {
  DEFAULT_GROUP_COLOR,
  DEFAULT_PROFILE_COLOR,
  eventMarkerColor,
  useCreateEvent,
  useDefaultGroup,
  useDefaultGroupId,
  useEvents,
} from '../lib/hooks'
import { dateKeyToLocalInput, parseDateKey, toDateKey } from '../lib/dateUtils'
import type { EventRow, EventScope } from '../types/database'
import { useAuth } from '../features/auth/AuthProvider'

function formatWhen(iso: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))
}

function formatDayHeading(key: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(parseDateKey(key))
}

function formatTime(iso: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))
}

function activeEvents(events: EventRow[] | undefined) {
  return (events ?? []).filter((e) => e.status !== 'cancelled')
}

export function HomePage() {
  const { profile } = useAuth()
  const { data: groupId } = useDefaultGroupId()
  const { data: group } = useDefaultGroup()
  const { data: events, isLoading } = useEvents(groupId)
  const createEvent = useCreateEvent()

  const todayKey = toDateKey(new Date())
  const [month, setMonth] = useState(() => new Date())
  const [selectedKey, setSelectedKey] = useState(todayKey)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    title: '',
    description: '',
    start_at: dateKeyToLocalInput(todayKey),
    location_name: '',
    scope: 'individual' as EventScope,
  })

  const groupColor = group?.calendar_color ?? DEFAULT_GROUP_COLOR
  const live = useMemo(() => activeEvents(events), [events])

  const dayMarkers = useMemo(() => {
    const map = new Map<string, { colors: string[]; count: number }>()
    for (const ev of live) {
      const key = toDateKey(new Date(ev.start_at))
      const color = eventMarkerColor(ev, groupColor)
      const existing = map.get(key)
      if (!existing) {
        map.set(key, { colors: [color], count: 1 })
      } else {
        existing.count += 1
        if (!existing.colors.includes(color) && existing.colors.length < 3) {
          existing.colors.push(color)
        }
      }
    }
    return map
  }, [live, groupColor])

  const legendItems = useMemo(() => {
    const items: { key: string; label: string; color: string }[] = []
    const seen = new Set<string>()
    items.push({ key: 'group', label: 'Evento de grupo', color: groupColor })
    seen.add(groupColor)
    for (const ev of live) {
      if (ev.scope === 'group') continue
      const color = ev.profiles?.calendar_color || DEFAULT_PROFILE_COLOR
      const name = ev.profiles?.name ?? 'Alguém'
      const id = ev.created_by
      if (seen.has(id)) continue
      seen.add(id)
      items.push({ key: id, label: name, color })
      if (items.length >= 8) break
    }
    return items
  }, [live, groupColor])

  const dayEvents = useMemo(
    () =>
      live
        .filter((ev) => toDateKey(new Date(ev.start_at)) === selectedKey)
        .sort((a, b) => +new Date(a.start_at) - +new Date(b.start_at)),
    [live, selectedKey],
  )

  const next = live.find((e) => new Date(e.start_at) >= new Date())

  function selectDay(key: string) {
    setSelectedKey(key)
    setCreating(false)
    setError(null)
    setForm((f) => ({ ...f, start_at: dateKeyToLocalInput(key) }))
  }

  function openCreate() {
    setCreating(true)
    setError(null)
    setForm({
      title: '',
      description: '',
      start_at: dateKeyToLocalInput(selectedKey),
      location_name: '',
      scope: 'individual',
    })
  }

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
        scope: form.scope,
      })
      setCreating(false)
      setForm({
        title: '',
        description: '',
        start_at: dateKeyToLocalInput(selectedKey),
        location_name: '',
        scope: 'individual',
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível criar o evento.')
    }
  }

  return (
    <div className="space-y-6">
      <PageTitle subtitle="Toque num dia para ver ou marcar um rolê.">Calendário</PageTitle>

      {next && (
        <Link
          to={`/agenda/${next.id}`}
          className="group block rounded-2xl border border-citrus/25 bg-citrus/5 px-4 py-3 transition hover:border-citrus/50 hover:bg-citrus/10"
        >
          <p className="text-xs uppercase tracking-widest text-citrus/80">Próximo rolê</p>
          <p className="mt-0.5 font-display text-xl text-foam group-hover:text-citrus">{next.title}</p>
          <p className="text-sm text-mist/70">{formatWhen(next.start_at)}</p>
        </Link>
      )}

      <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
        <Panel className="!p-4 sm:!p-5">
          {isLoading ? (
            <p className="py-8 text-center text-mist/60">Carregando calendário…</p>
          ) : (
            <>
              <MonthCalendar
                month={month}
                selectedKey={selectedKey}
                dayMarkers={dayMarkers}
                onMonthChange={setMonth}
                onSelectDay={selectDay}
              />
              {legendItems.length > 0 && (
                <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-2 border-t border-mist/10 pt-3 text-xs text-mist/70">
                  {legendItems.map((item) => (
                    <li key={item.key} className="inline-flex items-center gap-1.5">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: item.color }}
                        aria-hidden
                      />
                      {item.label}
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </Panel>

        <Panel className="!p-4 sm:!p-5">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-widest text-sky/70">Neste dia</p>
              <h3 className="mt-1 font-display text-xl capitalize text-foam">
                {formatDayHeading(selectedKey)}
              </h3>
            </div>
            {!creating && (
              <Button type="button" onClick={openCreate}>
                Novo evento
              </Button>
            )}
          </div>

          {creating ? (
            <form className="space-y-3" onSubmit={onCreate}>
              <Field label="Título">
                <Input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  required
                  autoFocus
                  placeholder="Ex.: Churras na casa do João"
                />
              </Field>
              <Field label="Tipo">
                <select
                  className="w-full rounded-xl border border-mist/15 bg-panel px-3 py-2.5 text-foam"
                  value={form.scope}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, scope: e.target.value as EventScope }))
                  }
                >
                  <option value="individual">
                    Compromisso individual
                    {profile?.calendar_color ? ` (${profile.calendar_color})` : ''}
                  </option>
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
                  placeholder="Opcional"
                />
              </Field>
              <Field label="Descrição">
                <TextArea
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                />
              </Field>
              {error && <ErrorText>{error}</ErrorText>}
              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={createEvent.isPending || !groupId}>
                  {createEvent.isPending ? 'Salvando…' : 'Criar evento'}
                </Button>
                <Button type="button" variant="ghost" onClick={() => setCreating(false)}>
                  Cancelar
                </Button>
              </div>
            </form>
          ) : dayEvents.length === 0 ? (
            <EmptyState
              title="Nada marcado neste dia."
              hint="Crie um rolê ou escolha outro dia no calendário."
            />
          ) : (
            <ul className="space-y-2">
              {dayEvents.map((ev) => {
                const color = eventMarkerColor(ev, groupColor)
                return (
                  <li key={ev.id}>
                    <Link
                      to={`/agenda/${ev.id}`}
                      className="flex items-baseline justify-between gap-3 rounded-xl border border-mist/10 bg-ink/30 px-3 py-3 transition hover:border-citrus/40"
                    >
                      <div className="min-w-0 flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: color }}
                          title={ev.scope === 'group' ? 'Grupo' : 'Individual'}
                          aria-hidden
                        />
                        <div className="min-w-0">
                          <p className="truncate font-medium text-foam">{ev.title}</p>
                          {ev.location_name && (
                            <p className="truncate text-xs text-mist/50">{ev.location_name}</p>
                          )}
                        </div>
                      </div>
                      <span className="shrink-0 text-sm tabular-nums text-citrus">
                        {formatTime(ev.start_at)}
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  )
}
