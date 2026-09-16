import { Link } from 'react-router-dom'
import { photoPublicUrl, useDefaultGroupId, useMemories } from '../lib/hooks'
import { EmptyState, PageTitle, Panel } from '../components/ui/primitives'
import { UserAvatar } from '../components/UserAvatar'

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' }).format(new Date(iso))
}

export function MemoriesPage() {
  const { data: groupId } = useDefaultGroupId()
  const { data: memories, isLoading } = useMemories(groupId)

  return (
    <div className="space-y-5">
      <PageTitle subtitle="Timeline dos rolês que já rolou.">Memórias</PageTitle>

      {isLoading && <p className="text-mist/60">Carregando…</p>}

      {!isLoading && (!memories || memories.length === 0) && (
        <EmptyState
          title="Nenhuma memória ainda."
          hint="Marque um evento como concluído e adicione fotos."
        />
      )}

      <ol className="relative space-y-6 border-l border-mist/15 pl-5">
        {memories?.map(({ event, attendees, photos }) => (
          <li key={event.id} className="relative">
            <span className="absolute -left-[1.4rem] top-2 h-3 w-3 rounded-full bg-citrus shadow-[0_0_0_4px_rgba(15,23,42,1)]" />
            <Panel className="space-y-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="font-display text-2xl text-foam">
                  <Link to={`/agenda/${event.id}`} className="hover:text-citrus">
                    {event.title}
                  </Link>
                </h2>
                <p className="text-sm text-mist/60">{formatDate(event.start_at)}</p>
              </div>

              {event.location_name && <p className="text-sm text-mist/70">{event.location_name}</p>}
              {event.description && <p className="text-sm text-mist/65">{event.description}</p>}

              {attendees.length > 0 && (
                <div>
                  <p className="text-xs uppercase tracking-wide text-sky/70">Participantes</p>
                  <ul className="mt-2 flex flex-wrap gap-3">
                    {attendees.map((a) => (
                      <li key={a.id} className="flex items-center gap-2 text-sm text-mist/80">
                        <UserAvatar
                          name={a.profiles?.name}
                          avatarPath={a.profiles?.avatar_path}
                          size="xs"
                        />
                        <span>{a.profiles?.name ?? 'Alguém'}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {photos.length > 0 && (
                <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {photos.slice(0, 8).map((photo) => (
                    <li key={photo.id} className="overflow-hidden rounded-lg border border-mist/10">
                      <img
                        src={photoPublicUrl(photo.storage_path)}
                        alt=""
                        className="aspect-square w-full object-cover"
                        loading="lazy"
                      />
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </li>
        ))}
      </ol>
    </div>
  )
}
