import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../features/auth/AuthProvider'
import { changePassword } from '../features/auth/authService'
import { DEFAULT_PROFILE_COLOR, useRemoveAvatar, useUpdateMyProfile, useUploadAvatar } from '../lib/hooks'
import { UserAvatar } from '../components/UserAvatar'
import { Button, ErrorText, Field, Input, PageTitle, Panel } from '../components/ui/primitives'

const PRESET_COLORS = [
  '#7dd3fc',
  '#c8f542',
  '#fb7185',
  '#a78bfa',
  '#fbbf24',
  '#34d399',
  '#f472b6',
  '#38bdf8',
]

export function ProfilePage() {
  const { profile } = useAuth()
  const uploadAvatar = useUploadAvatar()
  const removeAvatar = useRemoveAvatar()
  const updateProfile = useUpdateMyProfile()
  const fileRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [colorMsg, setColorMsg] = useState<string | null>(null)
  const [pwdMsg, setPwdMsg] = useState<string | null>(null)
  const [pwdBusy, setPwdBusy] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [calendarColor, setCalendarColor] = useState(profile?.calendar_color ?? DEFAULT_PROFILE_COLOR)

  useEffect(() => {
    if (profile?.calendar_color) setCalendarColor(profile.calendar_color)
  }, [profile?.calendar_color])

  async function onFileSelected(file: File | undefined) {
    if (!file) return
    setError(null)
    try {
      await uploadAvatar.mutateAsync(file)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao enviar foto')
    } finally {
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function onRemove() {
    setError(null)
    try {
      await removeAvatar.mutateAsync()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao remover foto')
    }
  }

  async function onSaveColor(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setColorMsg(null)
    const hex = calendarColor.trim()
    if (!/^#[0-9A-Fa-f]{6}$/.test(hex)) {
      setError('Use uma cor hex no formato #RRGGBB')
      return
    }
    try {
      await updateProfile.mutateAsync({ calendar_color: hex })
      setColorMsg('Cor do calendário salva.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao salvar cor')
    }
  }

  if (!profile) return null

  const busy = uploadAvatar.isPending || removeAvatar.isPending

  return (
    <div className="space-y-5">
      <PageTitle subtitle="Sua foto e cor aparecem no grupo, nos eventos e no calendário.">
        Meu perfil
      </PageTitle>

      <Panel className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
        <UserAvatar name={profile.name} avatarPath={profile.avatar_path} size="lg" />
        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <p className="font-display text-2xl text-foam">{profile.name}</p>
            <p className="text-sm text-mist/60">@{profile.username}</p>
          </div>
          <p className="text-sm text-mist/70">
            JPEG, PNG, WebP ou GIF · até 5 MB. A leitura é pública no bucket; só você sobe ou remove a
            própria foto.
          </p>
          <div className="flex flex-wrap gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={(e) => void onFileSelected(e.target.files?.[0])}
            />
            <Button type="button" disabled={busy} onClick={() => fileRef.current?.click()}>
              {uploadAvatar.isPending
                ? 'Enviando…'
                : profile.avatar_path
                  ? 'Trocar foto'
                  : 'Adicionar foto'}
            </Button>
            {profile.avatar_path && (
              <Button type="button" variant="ghost" disabled={busy} onClick={() => void onRemove()}>
                {removeAvatar.isPending ? 'Removendo…' : 'Remover foto'}
              </Button>
            )}
          </div>
          {error && <ErrorText>{error}</ErrorText>}
        </div>
      </Panel>

      <Panel>
        <h2 className="font-display text-2xl">Cor no calendário</h2>
        <p className="mt-1 text-sm text-mist/60">
          Usada nos seus compromissos individuais. Todos do grupo veem essa cor.
        </p>
        <form className="mt-3 space-y-3" onSubmit={onSaveColor}>
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="color"
              value={calendarColor}
              onChange={(e) => setCalendarColor(e.target.value)}
              className="h-10 w-14 cursor-pointer rounded border border-mist/20 bg-transparent"
              aria-label="Escolher cor"
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
            <span
              className="h-8 w-8 rounded-full border border-mist/20"
              style={{ backgroundColor: calendarColor }}
              aria-hidden
            />
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
          {colorMsg && <p className="text-sm text-citrus">{colorMsg}</p>}
          <Button type="submit" disabled={updateProfile.isPending}>
            {updateProfile.isPending ? 'Salvando…' : 'Salvar cor'}
          </Button>
        </form>
      </Panel>

      <Panel>
        <h2 className="font-display text-2xl">Alterar senha</h2>
        <form
          className="mt-3 grid max-w-md gap-3"
          onSubmit={(e) => {
            e.preventDefault()
            setError(null)
            setPwdMsg(null)
            setPwdBusy(true)
            void changePassword(currentPassword, newPassword)
              .then(() => {
                setCurrentPassword('')
                setNewPassword('')
                setPwdMsg('Senha atualizada.')
              })
              .catch((err) => {
                setError(err instanceof Error ? err.message : 'Falha ao alterar senha')
              })
              .finally(() => setPwdBusy(false))
          }}
        >
          <Field label="Senha atual">
            <Input
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </Field>
          <Field label="Nova senha">
            <Input
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
            />
          </Field>
          {pwdMsg && <p className="text-sm text-citrus">{pwdMsg}</p>}
          <Button type="submit" disabled={pwdBusy}>
            {pwdBusy ? 'Salvando…' : 'Salvar senha'}
          </Button>
        </form>
      </Panel>
    </div>
  )
}
