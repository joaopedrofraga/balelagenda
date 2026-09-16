import { useDefaultGroupId, useGroupMembers } from '../lib/hooks'
import { EmptyState, PageTitle, Panel } from '../components/ui/primitives'
import { UserAvatar } from '../components/UserAvatar'

export function GroupPage() {
  const { data: groupId } = useDefaultGroupId()
  const { data: members, isLoading } = useGroupMembers(groupId)

  return (
    <div className="space-y-5">
      <PageTitle subtitle="Quem faz parte da balela.">Grupo</PageTitle>
      {isLoading && <p className="text-mist/60">Carregando…</p>}
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
                  <p className="font-display text-xl">{m.profiles?.name ?? '—'}</p>
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
