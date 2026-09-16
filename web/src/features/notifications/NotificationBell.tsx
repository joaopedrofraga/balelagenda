import { Link } from 'react-router-dom'
import { useNotifications, useNotificationsRealtime } from '../../lib/hooks'

export function NotificationBell() {
  useNotificationsRealtime()
  const { data: notifications } = useNotifications()
  const unread = notifications?.filter((n) => !n.read).length ?? 0

  return (
    <Link
      to="/notificacoes"
      className="relative rounded-lg border border-mist/20 px-3 py-2 text-sm text-mist hover:border-sky hover:text-sky"
      aria-label={unread > 0 ? `${unread} notificações não lidas` : 'Notificações'}
    >
      Avisos
      {unread > 0 && (
        <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-coral px-1 text-[10px] font-bold text-ink">
          {unread > 9 ? '9+' : unread}
        </span>
      )}
    </Link>
  )
}
