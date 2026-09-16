import { useDefaultGroupId, useGroupStats, useMyBadges } from '../lib/hooks'
import { EmptyState, PageTitle, Panel } from '../components/ui/primitives'
import { UserAvatar } from '../components/UserAvatar'

function formatMoney(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

export function StatsPage() {
  const { data: groupId } = useDefaultGroupId()
  const { data: stats, isLoading } = useGroupStats(groupId)
  const { data: badges } = useMyBadges(groupId)

  const earned = badges?.filter((b) => b.earned).length ?? 0

  return (
    <div className="space-y-6">
      <PageTitle subtitle="Números do grupo e suas conquistas.">Estatísticas</PageTitle>

      {isLoading && <p className="text-mist/60">Carregando…</p>}
      {!isLoading && !stats && <EmptyState title="Sem dados ainda." hint="Crie eventos e a magia começa." />}

      {stats && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard label="Eventos" value={String(stats.events_total)} hint={`${stats.events_planned} planejados · ${stats.events_completed} memórias`} />
          <StatCard label="Presenças" value={String(stats.attendance_going)} hint={`${stats.members_active} membros ativos`} />
          <StatCard label="Ideias" value={String(stats.ideas_active)} hint={`${stats.votes_total} votos`} />
          <StatCard label="Comentários" value={String(stats.comments_total)} />
          <StatCard label="Fotos" value={String(stats.photos_total)} />
          <StatCard
            label="Despesas"
            value={formatMoney(Number(stats.expenses_total))}
            hint={`${stats.expenses_count} lançamentos`}
          />
        </div>
      )}

      {stats && (
        <div className="grid gap-4 md:grid-cols-2">
          <Panel>
            <h2 className="font-display text-2xl">Mais presentes</h2>
            <ul className="mt-3 space-y-2 text-sm text-mist/80">
              {(stats.top_attendees ?? []).map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-2">
                    <UserAvatar name={p.name} avatarPath={p.avatar_path} size="xs" />
                    <span className="truncate">{p.name}</span>
                  </span>
                  <span className="text-foam">{p.going_count ?? 0}×</span>
                </li>
              ))}
              {(stats.top_attendees ?? []).length === 0 && (
                <li className="text-mist/50">Ainda sem confirmações.</li>
              )}
            </ul>
          </Panel>
          <Panel>
            <h2 className="font-display text-2xl">Anfitriões</h2>
            <ul className="mt-3 space-y-2 text-sm text-mist/80">
              {(stats.top_creators ?? []).map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-2">
                    <UserAvatar name={p.name} avatarPath={p.avatar_path} size="xs" />
                    <span className="truncate">{p.name}</span>
                  </span>
                  <span className="text-foam">{p.events_created ?? 0} eventos</span>
                </li>
              ))}
              {(stats.top_creators ?? []).length === 0 && (
                <li className="text-mist/50">Ninguém criou evento ainda.</li>
              )}
            </ul>
          </Panel>
        </div>
      )}

      <Panel className="space-y-3">
        <div>
          <h2 className="font-display text-2xl">Badges</h2>
          <p className="text-sm text-mist/70">
            {earned} de {badges?.length ?? 0} conquistadas
          </p>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2">
          {(badges ?? []).map((badge) => (
            <li
              key={badge.id}
              className={`rounded-xl border px-3 py-3 ${
                badge.earned ? 'border-citrus/40 bg-citrus/10' : 'border-mist/10 bg-ink/30 opacity-70'
              }`}
            >
              <p className="font-medium text-foam">{badge.label}</p>
              <p className="mt-1 text-sm text-mist/70">{badge.description}</p>
              <p className="mt-2 text-xs text-mist/50">
                {badge.earned ? 'Conquistada' : `${badge.progress}/${badge.target}`}
              </p>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  )
}

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Panel>
      <p className="text-xs uppercase tracking-widest text-sky/80">{label}</p>
      <p className="mt-1 font-display text-3xl text-foam">{value}</p>
      {hint && <p className="mt-1 text-xs text-mist/50">{hint}</p>}
    </Panel>
  )
}
