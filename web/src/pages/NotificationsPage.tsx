import { Link } from 'react-router-dom'
import {
  useMarkNotificationsRead,
  useNotifications,
} from '../lib/hooks'
import { Button, EmptyState, ErrorText, PageTitle, Panel } from '../components/ui/primitives'
import type { AppNotification } from '../types/database'

function formatWhen(iso: string | null | undefined) {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(date)
  } catch {
    return '—'
  }
}

function asNotificationList(data: unknown): AppNotification[] {
  if (!Array.isArray(data)) return []
  return data.filter((item): item is AppNotification => !!item && typeof item === 'object')
}

export function NotificationsPage() {
  const { data, isLoading, isError, error, refetch } = useNotifications()
  const markRead = useMarkNotificationsRead()
  const notifications = asNotificationList(data)
  const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id)

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <PageTitle subtitle="Atualizações do grupo em tempo quase real.">Notificações</PageTitle>
        {unreadIds.length > 0 && (
          <Button
            type="button"
            variant="ghost"
            disabled={markRead.isPending}
            onClick={() => void markRead.mutateAsync(null)}
          >
            Marcar todas lidas
          </Button>
        )}
      </div>

      {isLoading && <p className="text-mist/60">Carregando…</p>}

      {isError && (
        <div className="space-y-3">
          <ErrorText>
            Não foi possível carregar os avisos
            {error instanceof Error && error.message ? `: ${error.message}` : '.'}
          </ErrorText>
          <Button type="button" variant="ghost" onClick={() => void refetch()}>
            Tentar de novo
          </Button>
        </div>
      )}

      {!isLoading && !isError && notifications.length === 0 && (
        <EmptyState
          title="Nenhum aviso ainda."
          hint="Quando alguém criar evento, comentar ou lançar despesa, aparece aqui."
        />
      )}

      {!isError && notifications.length > 0 && (
        <ul className="space-y-3">
          {notifications.map((n) => (
            <li key={n.id}>
              <Panel className={n.read ? 'opacity-70' : 'border-citrus/30'}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-sky/80">{n.type}</p>
                    <h2 className="font-display text-xl text-foam">{n.title}</h2>
                    <p className="mt-1 text-sm text-mist/80">{n.message}</p>
                    <p className="mt-2 text-xs text-mist/40">{formatWhen(n.created_at)}</p>
                    {n.event_id && (
                      <Link
                        to={`/agenda/${n.event_id}`}
                        className="mt-2 inline-block text-sm text-citrus underline"
                      >
                        Ver evento
                      </Link>
                    )}
                  </div>
                  {!n.read && (
                    <Button
                      type="button"
                      variant="ghost"
                      className="shrink-0 px-2 py-1 text-xs"
                      onClick={() => void markRead.mutateAsync([n.id])}
                    >
                      Lida
                    </Button>
                  )}
                </div>
              </Panel>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
