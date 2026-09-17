import { useEffect, useState } from 'react'
import { useAuth } from '../features/auth/AuthProvider'
import {
  DEFAULT_GROUP_COLOR,
  useDefaultGroup,
  useGroupMembers,
  useUpdateGroup,
} from '../lib/hooks'
import { Button, EmptyState, ErrorText, Field, Input, PageTitle, Panel } from '../components/ui/primitives'
import { UserAvatar } from '../components/UserAvatar'

const PRESET_COLORS = [
  '#c8f542',
  '#7dd3fc',
  '#fb7185',
  '#a78bfa',
  '#fbbf24',
  '#34d399',
  '#f472b6',
  '#38bdf8',
]

export function GroupPage() {
  const { isAdmin } = useAuth()
  const { data: group, isLoading: groupLoading } = useDefaultGroup()
  const { data: members, isLoading } = useGroupMembers(group?.id)
  const updateGroup = useUpdateGroup()
  const [calendarColor, setCalendarColor] = useState(DEFAULT_GROUP_COLOR)
  const [msg, setMsg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (group?.calendar_color) setCalendarColor(group.calendar_color)
  }, [group?.calendar_color])

  async function onSaveColor(e: React.FormEvent) {
    e.preventDefault()
    if (!group) return
    setError(null)
    setMsg(null)
    const hex = calendarColor.trim()
    if (!/^#[0-9A-Fa-f]{6}$/.test(hex)) {
      setError('Use uma cor hex no formato #RRGGBB')
      return
    }
    try {
      await updateGroup.mutateAsync({ id: group.id, calendar_color: hex })
      setMsg('Cor do grupo salva.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao salvar cor do grupo')
    }
  }

  return (
    <div className="space-y-5">
      <PageTitle subtitle="Quem faz parte da balela.">Grupo</PageTitle>

      {group && (
        <Panel>
          <div className="flex flex-wrap items-center gap-3">
            <span
              className="h-8 w-8 rounded-full border border-mist/20"
              style={{ backgroundColor: group.calendar_color || DEFAULT_GROUP_COLOR }}
              aria-hidden
            />
            <div>
              <p className="font-display text-xl text-foam">{group.name}</p>
              <p className="text-sm text-mist/60">
                Cor dos eventos de grupo: {group.calendar_color || DEFAULT_GROUP_COLOR}
              </p>
            </div>
          </div>

          {isAdmin && (
            <form className="mt-4 space-y-3 border-t border-mist/10 pt-4" onSubmit={onSaveColor}>
              <h3 className="text-sm font-medium text-foam">Cor do grupo (admin)</h3>
              <div className="flex flex-wrap items-center gap-3">
                <input
                  type="color"
                  value={calendarColor}
                  onChange={(e) => setCalendarColor(e.target.value)}
                  className="h-10 w-14 cursor-pointer rounded border border-mist/20 bg-transparent"
                  aria-label="Cor do grupo"
                />
                <Field label="Hex">
                  <Input
                    value={calendarColor}
                    onChange={(e) => setCalendarColor(e.target.value)}
                    pattern="#[0-9A-Fa-f]{6}"
                    maxLength={7}
                    className="max-w-[8rem] font-mono"
                  />
                </Field>
              </div>
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    title={c}
                    onClick={() => setCalendarColor(c)}
                    className="h-7 w-7 rounded-full border border-mist/20 transition hover:scale-110"
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
              {msg && <p className="text-sm text-citrus">{msg}</p>}
              {error && <ErrorText>{error}</ErrorText>}
              <Button type="submit" disabled={updateGroup.isPending}>
                {updateGroup.isPending ? 'Salvando…' : 'Salvar cor do grupo'}
              </Button>
            </form>
          )}
        </Panel>
      )}

      {(isLoading || groupLoading) && <p className="text-mist/60">Carregando…</p>}
      {!isLoading && (!members || members.length === 0) && (
        <EmptyState title="Nenhum membro visível." hint="Confirme se o seed do grupo foi aplicado." />
      )}
      <ul className="space-y-3">
        {members?.map((m) => (
          <li key={m.id}>
            <Panel className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <UserAvatar
                  name={m.profiles?.name}
                  avatarPath={m.profiles?.avatar_path}
                  size="md"
                />
                <div className="min-w-0">
                  <p className="flex items-center gap-2 font-display text-xl">
                    {m.profiles?.name ?? '—'}
                    {m.profiles?.calendar_color && (
                      <span
                        className="inline-block h-3 w-3 rounded-full"
                        style={{ backgroundColor: m.profiles.calendar_color }}
                        title="Cor no calendário"
                        aria-hidden
                      />
                    )}
                  </p>
                  <p className="text-sm text-mist/60">@{m.profiles?.username}</p>
                </div>
              </div>
              <span className="rounded-lg bg-ink/50 px-2 py-1 text-xs uppercase tracking-wide text-sky/80">
                {m.role}
              </span>
            </Panel>
          </li>
        ))}
      </ul>
    </div>
  )
}
