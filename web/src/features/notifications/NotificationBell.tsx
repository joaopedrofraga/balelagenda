import { Link } from 'react-router-dom'
import { useNotifications, useNotificationsRealtime } from '../../lib/hooks'

export function NotificationBell() {
  useNotificationsRealtime()
  const { data: notifications } = useNotifications()
  const list = Array.isArray(notifications) ? notifications : []
  const unread = list.filter((n) => !n.read).length

  return (
    <Link
      to="/notificacoes"
      className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-mist/20 text-mist transition hover:border-sky hover:text-sky"
      aria-label={unread > 0 ? `${unread} avisos não lidos` : 'Avisos'}
      title="Avisos"
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M6 9a6 6 0 1 1 12 0c0 7 3 7 3 9H3c0-2 3-2 3-9" />
        <path d="M10 20a2 2 0 0 0 4 0" />
      </svg>
      {unread > 0 && (
        <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-coral px-1 text-[10px] font-bold text-ink">
          {unread > 9 ? '9+' : unread}
        </span>
      )}
    </Link>
  )
}
