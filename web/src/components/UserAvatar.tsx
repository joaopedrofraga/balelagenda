import { avatarPublicUrl } from '../lib/hooks'

const SIZE_CLASS = {
  xs: 'h-6 w-6 text-[10px]',
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-20 w-20 text-2xl',
} as const

function initialsFromName(name?: string | null) {
  if (!name?.trim()) return '?'
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return `${parts[0]![0] ?? ''}${parts[parts.length - 1]![0] ?? ''}`.toUpperCase()
}

export function UserAvatar({
  name,
  avatarPath,
  size = 'md',
  className = '',
}: {
  name?: string | null
  avatarPath?: string | null
  size?: keyof typeof SIZE_CLASS
  className?: string
}) {
  const url = avatarPath ? avatarPublicUrl(avatarPath) : null
  const initials = initialsFromName(name)

  if (url) {
    return (
      <img
        src={url}
        alt={name ? `Foto de ${name}` : 'Foto de perfil'}
        className={`shrink-0 rounded-full object-cover ring-1 ring-mist/15 ${SIZE_CLASS[size]} ${className}`}
        loading="lazy"
      />
    )
  }

  return (
    <span
      aria-hidden={!name}
      title={name ?? undefined}
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-sky/20 font-semibold text-sky ring-1 ring-mist/15 ${SIZE_CLASS[size]} ${className}`}
    >
      {initials}
    </span>
  )
}
