import { useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../features/auth/AuthProvider'
import {
  canManageEvent,
  photoPublicUrl,
  useAddComment,
  useAttendees,
  useDefaultGroup,
  useDeleteComment,
  useDeleteEventPhoto,
  useEvent,
  useEventComments,
  useEventHistory,
  useEventPhotos,
  useEventRealtime,
  useSetAttendance,
  useUpdateEvent,
  useUploadEventPhoto,
} from '../lib/hooks'
import type { AttendanceStatus, EventHistoryAction, EventScope } from '../types/database'
import {
  Button,
  ErrorText,
  Field,
  Input,
  PageTitle,
  Panel,
  TextArea,
} from '../components/ui/primitives'
import { ExpensePanel } from '../features/expenses/ExpensePanel'
import { UserAvatar } from '../components/UserAvatar'

const OPTIONS: { value: AttendanceStatus; label: string }[] = [
  { value: 'going', label: 'Vou' },
  { value: 'maybe', label: 'Talvez' },
  { value: 'not_going', label: 'Não vou' },
]

const HISTORY_LABEL: Record<EventHistoryAction, string> = {
  created: 'criou o evento',
  edited: 'editou o evento',
  cancelled: 'cancelou o evento',
  restored: 'restaurou o evento',
  completed: 'marcou como memória',
}

function formatWhen(iso: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(iso))
}

export function EventDetailPage() {
  const { id } = useParams()
  const { profile } = useAuth()
  const { data: event, isLoading } = useEvent(id)
  const { data: group } = useDefaultGroup()
  useEventRealtime(id)
  const { data: attendees } = useAttendees(id)
  const { data: comments } = useEventComments(id)
  const { data: history } = useEventHistory(id)
  const { data: photos } = useEventPhotos(id)
  const setAttendance = useSetAttendance(id!)
  const updateEvent = useUpdateEvent()
  const addComment = useAddComment(id!)
  const deleteComment = useDeleteComment(id!)
  const uploadPhoto = useUploadEventPhoto(id!)
  const deletePhoto = useDeleteEventPhoto(id!)
  const fileRef = useRef<HTMLInputElement>(null)

  const [editing, setEditing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [commentText, setCommentText] = useState('')
  const [commentError, setCommentError] = useState<string | null>(null)
  const [photoError, setPhotoError] = useState<string | null>(null)
  const [form, setForm] = useState({
    title: '',
    description: '',
    location_name: '',
    start_at: '',
    scope: 'individual' as EventScope,
  })

  const counts = useMemo(() => {
    const c = { going: 0, maybe: 0, not_going: 0 }
    attendees?.forEach((a) => {
      c[a.status as AttendanceStatus] += 1
    })
    return c
  }, [attendees])

  const mine = attendees?.find((a) => a.user_id === profile?.id)
  const canManage = event ? canManageEvent(event, profile) : false

  function startEdit() {
    if (!event) return
    setForm({
      title: event.title,
      description: event.description ?? '',
      location_name: event.location_name ?? '',
      start_at: event.start_at.slice(0, 16),
      scope: event.scope ?? 'individual',
    })
    setEditing(true)
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!event) return
    setError(null)
    try {
      await updateEvent.mutateAsync({
        id: event.id,
        title: form.title,
        description: form.description || null,
        location_name: form.location_name || null,
        start_at: new Date(form.start_at).toISOString(),
        scope: form.scope,
      })
      setEditing(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao salvar')
    }
  }

  async function setStatus(status: 'cancelled' | 'completed' | 'planned') {
    if (!event) return
    setError(null)
    try {
      await updateEvent.mutateAsync({ id: event.id, status })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao atualizar status')
    }
  }

  async function onComment(e: React.FormEvent) {
    e.preventDefault()
    setCommentError(null)
    try {
      await addComment.mutateAsync(commentText)
      setCommentText('')
    } catch (err) {
      setCommentError(err instanceof Error ? err.message : 'Falha ao comentar')
    }
  }

  async function onPhotoSelected(file: File | undefined) {
    if (!file) return
    setPhotoError(null)
    try {
      await uploadPhoto.mutateAsync(file)
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : 'Falha no upload')
    } finally {
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  if (isLoading) return <p className="text-mist/60">Carregando…</p>
  if (!event) return <p className="text-coral">Evento não encontrado.</p>

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <PageTitle subtitle={event.status}>{event.title}</PageTitle>
        <Link to="/agenda" className="text-sm text-citrus underline">
          Voltar
        </Link>
      </div>

      <Panel className="space-y-2">
        <p className="text-mist/80">
          {new Intl.DateTimeFormat('pt-BR', { dateStyle: 'full', timeStyle: 'short' }).format(
            new Date(event.start_at),
          )}
        </p>
        {event.location_name && <p>Local: {event.location_name}</p>}
        {event.description && <p className="text-mist/70">{event.description}</p>}
        <p className="text-xs text-mist/50">
          Tipo: {event.scope === 'group' ? 'Evento de grupo' : 'Compromisso individual'}
          {event.scope === 'group' && group?.calendar_color
            ? ` · cor do grupo ${group.calendar_color}`
            : event.profiles?.calendar_color
              ? ` · cor ${event.profiles.calendar_color}`
              : ''}
        </p>
        {event.profiles && (
          <p className="flex items-center gap-2 text-xs text-mist/40">
            <UserAvatar name={event.profiles.name} avatarPath={event.profiles.avatar_path} size="xs" />
            Criado por {event.profiles.name}
          </p>
        )}
        {canManage && (
          <div className="flex flex-wrap gap-2 pt-2">
            <Button variant="ghost" type="button" onClick={startEdit}>
              Editar
            </Button>
            {event.status !== 'cancelled' && (
              <Button variant="danger" type="button" onClick={() => void setStatus('cancelled')}>
                Cancelar
              </Button>
            )}
            {event.status === 'cancelled' && (
              <Button variant="ghost" type="button" onClick={() => void setStatus('planned')}>
                Restaurar
              </Button>
            )}
            {event.status !== 'completed' && event.status !== 'cancelled' && (
              <Button type="button" onClick={() => void setStatus('completed')}>
                Virar memória
              </Button>
            )}
          </div>
        )}
        {error && <ErrorText>{error}</ErrorText>}
      </Panel>

      {editing && canManage && (
        <Panel>
          <form className="space-y-3" onSubmit={saveEdit}>
            <Field label="Título">
              <Input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                required
              />
            </Field>
            <Field label="Tipo">
              <select
                className="w-full rounded-xl border border-mist/15 bg-panel px-3 py-2.5 text-foam"
                value={form.scope}
                onChange={(e) => setForm((f) => ({ ...f, scope: e.target.value as EventScope }))}
              >
                <option value="individual">Compromisso individual</option>
                <option value="group">Evento de grupo</option>
              </select>
            </Field>
            <Field label="Data">
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
            <Field label="Descrição">
              <TextArea
                rows={3}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </Field>
            <Button type="submit">Salvar</Button>
          </form>
        </Panel>
      )}

      <Panel>
        <h2 className="font-display text-2xl">Presença</h2>
        <p className="mt-1 text-sm text-mist/70">
          Confirmados: {counts.going} · Talvez: {counts.maybe} · Não vão: {counts.not_going}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {OPTIONS.map((opt) => (
            <Button
              key={opt.value}
              type="button"
              variant={mine?.status === opt.value ? 'primary' : 'ghost'}
              onClick={() => void setAttendance.mutateAsync(opt.value)}
            >
              {opt.label}
            </Button>
          ))}
        </div>
        <ul className="mt-4 space-y-2 text-sm text-mist/80">
          {attendees?.map((a) => (
            <li key={a.id} className="flex items-center gap-2">
              <UserAvatar name={a.profiles?.name} avatarPath={a.profiles?.avatar_path} size="xs" />
              <span>
                {a.profiles?.name ?? a.user_id} — {a.status}
              </span>
            </li>
          ))}
        </ul>
      </Panel>

      <ExpensePanel eventId={event.id} groupId={event.group_id} />

      <Panel className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-display text-2xl">Fotos</h2>
          <div>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={(e) => void onPhotoSelected(e.target.files?.[0])}
            />
            <Button
              type="button"
              variant="ghost"
              disabled={uploadPhoto.isPending}
              onClick={() => fileRef.current?.click()}
            >
              {uploadPhoto.isPending ? 'Enviando…' : 'Adicionar foto'}
            </Button>
          </div>
        </div>
        {photoError && <ErrorText>{photoError}</ErrorText>}
        {(!photos || photos.length === 0) && (
          <p className="text-sm text-mist/60">Nenhuma foto ainda. Guarde o rolê aqui.</p>
        )}
        {photos && photos.length > 0 && (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {photos.map((photo) => (
              <li key={photo.id} className="group relative overflow-hidden rounded-xl border border-mist/10">
                <img
                  src={photoPublicUrl(photo.storage_path)}
                  alt={photo.caption ?? 'Foto do evento'}
                  className="aspect-square w-full object-cover"
                  loading="lazy"
                />
                {photo.uploaded_by === profile?.id && (
                  <button
                    type="button"
                    className="absolute right-2 top-2 rounded-lg bg-ink/80 px-2 py-1 text-xs text-coral opacity-0 transition group-hover:opacity-100"
                    onClick={() => void deletePhoto.mutateAsync(photo)}
                  >
                    Remover
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel className="space-y-3">
        <h2 className="font-display text-2xl">Comentários</h2>
        <form className="flex flex-col gap-2 sm:flex-row" onSubmit={onComment}>
          <TextArea
            rows={2}
            className="flex-1"
            placeholder="Quem vai de carro? Levo bebida…"
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            required
          />
          <Button type="submit" disabled={addComment.isPending} className="sm:self-end">
            Comentar
          </Button>
        </form>
        {commentError && <ErrorText>{commentError}</ErrorText>}
        <ul className="space-y-3">
          {comments?.map((c) => (
            <li key={c.id} className="rounded-xl border border-mist/10 bg-ink/30 px-3 py-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-start gap-2">
                  <UserAvatar name={c.profiles?.name} avatarPath={c.profiles?.avatar_path} size="sm" />
                  <div>
                    <p className="text-sm font-medium text-foam">{c.profiles?.name ?? 'Alguém'}</p>
                    <p className="mt-1 text-sm text-mist/80 whitespace-pre-wrap">{c.message}</p>
                    <p className="mt-1 text-xs text-mist/40">{formatWhen(c.created_at)}</p>
                  </div>
                </div>
                {c.user_id === profile?.id && (
                  <Button
                    type="button"
                    variant="ghost"
                    className="px-2 py-1 text-xs"
                    onClick={() => void deleteComment.mutateAsync(c.id)}
                  >
                    Apagar
                  </Button>
                )}
              </div>
            </li>
          ))}
          {comments && comments.length === 0 && (
            <p className="text-sm text-mist/60">Seja o primeiro a comentar.</p>
          )}
        </ul>
      </Panel>

      <Panel className="space-y-3">
        <h2 className="font-display text-2xl">Histórico</h2>
        <ul className="space-y-2 text-sm text-mist/75">
          {history?.map((h) => (
            <li key={h.id} className="flex flex-wrap items-center gap-x-2 gap-y-1 border-b border-mist/5 pb-2">
              <UserAvatar name={h.profiles?.name} avatarPath={h.profiles?.avatar_path} size="xs" />
              <span className="text-foam">{h.profiles?.name ?? 'Sistema'}</span>
              <span>{HISTORY_LABEL[h.action] ?? h.action}</span>
              <span className="text-mist/40">{formatWhen(h.created_at)}</span>
            </li>
          ))}
          {history && history.length === 0 && (
            <p className="text-mist/60">Sem alterações registradas.</p>
          )}
        </ul>
      </Panel>
    </div>
  )
}
