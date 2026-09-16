import { useRef, useState } from 'react'
import { useAuth } from '../features/auth/AuthProvider'
import { useRemoveAvatar, useUploadAvatar } from '../lib/hooks'
import { UserAvatar } from '../components/UserAvatar'
import { Button, ErrorText, PageTitle, Panel } from '../components/ui/primitives'

export function ProfilePage() {
  const { profile } = useAuth()
  const uploadAvatar = useUploadAvatar()
  const removeAvatar = useRemoveAvatar()
  const fileRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)

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

  if (!profile) return null

  const busy = uploadAvatar.isPending || removeAvatar.isPending

  return (
    <div className="space-y-5">
      <PageTitle subtitle="Sua foto aparece no grupo, nos eventos e nos comentários.">
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
    </div>
  )
}
