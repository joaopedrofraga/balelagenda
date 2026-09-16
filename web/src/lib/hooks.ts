import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from './supabase'
import { useEffect } from 'react'
import type {
  AppNotification,
  AttendanceStatus,
  EventComment,
  EventExpense,
  EventHistory,
  EventPhoto,
  EventRow,
  GroupStats,
  OutingIdea,
  OutingVote,
  Profile,
  UserBadge,
  UserRole,
} from '../types/database'
import { useAuth } from '../features/auth/AuthProvider'

const EVENT_PHOTOS_BUCKET = 'event-photos'
const AVATARS_BUCKET = 'avatars'
const AVATAR_MAX_BYTES = 5 * 1024 * 1024
/** Nested profile columns used across event/comment/member joins — never password_hash */
export const PROFILE_REF = 'id,name,username,avatar_path'
/** Full public profile columns (excludes password_hash) */
export const PROFILE_PUBLIC =
  'id, name, username, email, role, active, avatar_path, created_at, updated_at, last_login_at'

export function photoPublicUrl(storagePath: string) {
  const { data } = supabase.storage.from(EVENT_PHOTOS_BUCKET).getPublicUrl(storagePath)
  return data.publicUrl
}

export function avatarPublicUrl(avatarPath: string) {
  const { data } = supabase.storage.from(AVATARS_BUCKET).getPublicUrl(avatarPath)
  return data.publicUrl
}

export function useDefaultGroupId() {
  return useQuery({
    queryKey: ['default-group'],
    queryFn: async () => {
      const { data, error } = await supabase.from('groups').select('id').order('created_at').limit(1).maybeSingle()
      if (error) throw error
      return data?.id ?? null
    },
  })
}

export function useEvents(groupId: string | null | undefined) {
  return useQuery({
    queryKey: ['events', groupId],
    enabled: !!groupId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select(`*, profiles:created_by(${PROFILE_REF})`)
        .eq('group_id', groupId!)
        .order('start_at', { ascending: true })
      if (error) throw error
      return data as EventRow[]
    },
  })
}

export function useEvent(eventId: string | undefined) {
  return useQuery({
    queryKey: ['event', eventId],
    enabled: !!eventId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select(`*, profiles:created_by(${PROFILE_REF})`)
        .eq('id', eventId!)
        .single()
      if (error) throw error
      return data as EventRow
    },
  })
}

export function useCreateEvent() {
  const qc = useQueryClient()
  const { profile } = useAuth()
  return useMutation({
    mutationFn: async (payload: {
      group_id: string
      title: string
      description?: string
      start_at: string
      end_at?: string
      location_name?: string
      category?: string
      notes?: string
    }) => {
      if (!profile) throw new Error('Não autenticado')
      const { data, error } = await supabase
        .from('events')
        .insert({ ...payload, created_by: profile.id, status: 'planned' })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['events'] }),
  })
}

export function useUpdateEvent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<EventRow> & { id: string }) => {
      const { data, error } = await supabase.from('events').update(patch).eq('id', id).select().single()
      if (error) throw error
      return data
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['events'] })
      qc.invalidateQueries({ queryKey: ['event', vars.id] })
      qc.invalidateQueries({ queryKey: ['event-history', vars.id] })
      qc.invalidateQueries({ queryKey: ['memories'] })
    },
  })
}

export function useAttendees(eventId: string | undefined) {
  return useQuery({
    queryKey: ['attendees', eventId],
    enabled: !!eventId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('event_attendees')
        .select(`*, profiles:user_id(${PROFILE_REF})`)
        .eq('event_id', eventId!)
      if (error) throw error
      return data
    },
  })
}

export function useSetAttendance(eventId: string) {
  const qc = useQueryClient()
  const { profile } = useAuth()
  return useMutation({
    mutationFn: async (status: AttendanceStatus) => {
      if (!profile) throw new Error('Não autenticado')
      const { error } = await supabase.from('event_attendees').upsert(
        {
          event_id: eventId,
          user_id: profile.id,
          status,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'event_id,user_id' },
      )
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['attendees', eventId] }),
  })
}

export function useIdeas(groupId: string | null | undefined) {
  return useQuery({
    queryKey: ['ideas', groupId],
    enabled: !!groupId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('outing_ideas')
        .select('*')
        .eq('group_id', groupId!)
        .eq('active', true)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as OutingIdea[]
    },
  })
}

export function useCreateIdea() {
  const qc = useQueryClient()
  const { profile } = useAuth()
  return useMutation({
    mutationFn: async (payload: {
      group_id: string
      title: string
      description?: string
      category?: string
      estimated_cost?: number
      period?: string
      ambiance?: string
    }) => {
      if (!profile) throw new Error('Não autenticado')
      const { data, error } = await supabase
        .from('outing_ideas')
        .insert({ ...payload, created_by: profile.id, active: true })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ideas'] }),
  })
}

export function useDrawIdea() {
  return useMutation({
    mutationFn: async (input: {
      groupId: string
      category?: string
      maxCost?: number
      period?: string
      ambiance?: string
      avoidRecentDays?: number
    }) => {
      const { data, error } = await supabase.rpc('draw_outing_idea', {
        p_group_id: input.groupId,
        p_category: input.category ?? null,
        p_max_cost: input.maxCost ?? null,
        p_period: input.period ?? null,
        p_ambiance: input.ambiance ?? null,
        p_avoid_recent_days: input.avoidRecentDays ?? 30,
      })
      if (error) throw error
      return data as OutingIdea
    },
  })
}

export function useGroupMembers(groupId: string | null | undefined) {
  return useQuery({
    queryKey: ['group-members', groupId],
    enabled: !!groupId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('group_members')
        .select(`*, profiles(${PROFILE_PUBLIC})`)
        .eq('group_id', groupId!)
        .eq('active', true)
      if (error) throw error
      return data
    },
  })
}

export function useProfilesAdmin() {
  return useQuery({
    queryKey: ['admin-profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select(PROFILE_PUBLIC)
        .order('created_at')
      if (error) throw error
      return data as Profile[]
    },
  })
}

export function useUpdateProfileAdmin() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: { id: string; name?: string; role?: UserRole; active?: boolean }) => {
      const { id, ...patch } = payload
      const { error } = await supabase.from('profiles').update(patch).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-profiles'] }),
  })
}

export function useUploadAvatar() {
  const qc = useQueryClient()
  const { profile, refreshProfile } = useAuth()
  return useMutation({
    mutationFn: async (file: File) => {
      if (!profile) throw new Error('Não autenticado')
      if (!file.type.startsWith('image/')) throw new Error('Envie apenas imagens')
      if (file.size > AVATAR_MAX_BYTES) throw new Error('Imagem maior que 5 MB')

      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
      const storagePath = `${profile.id}/${crypto.randomUUID()}.${ext}`
      const previousPath = profile.avatar_path

      const { error: uploadError } = await supabase.storage
        .from(AVATARS_BUCKET)
        .upload(storagePath, file, { contentType: file.type, upsert: false })
      if (uploadError) throw uploadError

      const { error } = await supabase
        .from('profiles')
        .update({ avatar_path: storagePath })
        .eq('id', profile.id)

      if (error) {
        await supabase.storage.from(AVATARS_BUCKET).remove([storagePath])
        throw error
      }

      if (previousPath && previousPath !== storagePath) {
        await supabase.storage.from(AVATARS_BUCKET).remove([previousPath])
      }

      return storagePath
    },
    onSuccess: async () => {
      await refreshProfile()
      void qc.invalidateQueries({ queryKey: ['group-members'] })
      void qc.invalidateQueries({ queryKey: ['admin-profiles'] })
      void qc.invalidateQueries({ queryKey: ['attendees'] })
      void qc.invalidateQueries({ queryKey: ['event-comments'] })
      void qc.invalidateQueries({ queryKey: ['event-history'] })
      void qc.invalidateQueries({ queryKey: ['events'] })
      void qc.invalidateQueries({ queryKey: ['event'] })
      void qc.invalidateQueries({ queryKey: ['memories'] })
      void qc.invalidateQueries({ queryKey: ['event-expenses'] })
      void qc.invalidateQueries({ queryKey: ['group-stats'] })
    },
  })
}

export function useRemoveAvatar() {
  const qc = useQueryClient()
  const { profile, refreshProfile } = useAuth()
  return useMutation({
    mutationFn: async () => {
      if (!profile) throw new Error('Não autenticado')
      const previousPath = profile.avatar_path
      const { error } = await supabase.from('profiles').update({ avatar_path: null }).eq('id', profile.id)
      if (error) throw error
      if (previousPath) {
        await supabase.storage.from(AVATARS_BUCKET).remove([previousPath])
      }
    },
    onSuccess: async () => {
      await refreshProfile()
      void qc.invalidateQueries({ queryKey: ['group-members'] })
      void qc.invalidateQueries({ queryKey: ['admin-profiles'] })
      void qc.invalidateQueries({ queryKey: ['attendees'] })
      void qc.invalidateQueries({ queryKey: ['event-comments'] })
      void qc.invalidateQueries({ queryKey: ['event-history'] })
      void qc.invalidateQueries({ queryKey: ['events'] })
      void qc.invalidateQueries({ queryKey: ['event'] })
      void qc.invalidateQueries({ queryKey: ['memories'] })
      void qc.invalidateQueries({ queryKey: ['event-expenses'] })
      void qc.invalidateQueries({ queryKey: ['group-stats'] })
    },
  })
}

export function useEventComments(eventId: string | undefined) {
  return useQuery({
    queryKey: ['event-comments', eventId],
    enabled: !!eventId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('event_comments')
        .select(`*, profiles:user_id(${PROFILE_REF})`)
        .eq('event_id', eventId!)
        .order('created_at', { ascending: true })
      if (error) throw error
      return data as EventComment[]
    },
  })
}

export function useAddComment(eventId: string) {
  const qc = useQueryClient()
  const { profile } = useAuth()
  return useMutation({
    mutationFn: async (message: string) => {
      if (!profile) throw new Error('Não autenticado')
      const trimmed = message.trim()
      if (!trimmed) throw new Error('Comentário vazio')
      const { data, error } = await supabase
        .from('event_comments')
        .insert({ event_id: eventId, user_id: profile.id, message: trimmed })
        .select(`*, profiles:user_id(${PROFILE_REF})`)
        .single()
      if (error) throw error
      return data as EventComment
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['event-comments', eventId] }),
  })
}

export function useDeleteComment(eventId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (commentId: string) => {
      const { error } = await supabase.from('event_comments').delete().eq('id', commentId)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['event-comments', eventId] }),
  })
}

export function useEventHistory(eventId: string | undefined) {
  return useQuery({
    queryKey: ['event-history', eventId],
    enabled: !!eventId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('event_history')
        .select(`*, profiles:changed_by(${PROFILE_REF})`)
        .eq('event_id', eventId!)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as EventHistory[]
    },
  })
}

export function useEventPhotos(eventId: string | undefined) {
  return useQuery({
    queryKey: ['event-photos', eventId],
    enabled: !!eventId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('event_photos')
        .select(`*, profiles:uploaded_by(${PROFILE_REF})`)
        .eq('event_id', eventId!)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as EventPhoto[]
    },
  })
}

export function useUploadEventPhoto(eventId: string) {
  const qc = useQueryClient()
  const { profile } = useAuth()
  return useMutation({
    mutationFn: async (file: File) => {
      if (!profile) throw new Error('Não autenticado')
      if (!file.type.startsWith('image/')) throw new Error('Envie apenas imagens')
      if (file.size > 5 * 1024 * 1024) throw new Error('Imagem maior que 5 MB')

      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
      const storagePath = `${eventId}/${crypto.randomUUID()}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from(EVENT_PHOTOS_BUCKET)
        .upload(storagePath, file, { contentType: file.type, upsert: false })
      if (uploadError) throw uploadError

      const { data, error } = await supabase
        .from('event_photos')
        .insert({
          event_id: eventId,
          uploaded_by: profile.id,
          storage_path: storagePath,
        })
        .select(`*, profiles:uploaded_by(${PROFILE_REF})`)
        .single()

      if (error) {
        await supabase.storage.from(EVENT_PHOTOS_BUCKET).remove([storagePath])
        throw error
      }
      return data as EventPhoto
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['event-photos', eventId] })
      qc.invalidateQueries({ queryKey: ['memories'] })
    },
  })
}

export function useDeleteEventPhoto(eventId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (photo: EventPhoto) => {
      const { error: dbError } = await supabase.from('event_photos').delete().eq('id', photo.id)
      if (dbError) throw dbError
      await supabase.storage.from(EVENT_PHOTOS_BUCKET).remove([photo.storage_path])
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['event-photos', eventId] })
      qc.invalidateQueries({ queryKey: ['memories'] })
    },
  })
}

export function useIdeaVotes(groupId: string | null | undefined) {
  return useQuery({
    queryKey: ['idea-votes', groupId],
    enabled: !!groupId,
    queryFn: async () => {
      const { data: ideas, error: ideasError } = await supabase
        .from('outing_ideas')
        .select('id')
        .eq('group_id', groupId!)
        .eq('active', true)
      if (ideasError) throw ideasError
      const ideaIds = (ideas ?? []).map((i) => i.id)
      if (ideaIds.length === 0) return [] as OutingVote[]

      const { data, error } = await supabase.from('outing_votes').select('*').in('outing_idea_id', ideaIds)
      if (error) throw error
      return data as OutingVote[]
    },
  })
}

export function useToggleIdeaVote() {
  const qc = useQueryClient()
  const { profile } = useAuth()
  return useMutation({
    mutationFn: async ({ ideaId, hasVoted }: { ideaId: string; hasVoted: boolean }) => {
      if (!profile) throw new Error('Não autenticado')
      if (hasVoted) {
        const { error } = await supabase
          .from('outing_votes')
          .delete()
          .eq('outing_idea_id', ideaId)
          .eq('user_id', profile.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('outing_votes').insert({
          outing_idea_id: ideaId,
          user_id: profile.id,
        })
        if (error) throw error
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['idea-votes'] }),
  })
}

export function useMemories(groupId: string | null | undefined) {
  return useQuery({
    queryKey: ['memories', groupId],
    enabled: !!groupId,
    queryFn: async () => {
      const { data: events, error } = await supabase
        .from('events')
        .select(`*, profiles:created_by(${PROFILE_REF})`)
        .eq('group_id', groupId!)
        .eq('status', 'completed')
        .order('start_at', { ascending: false })
      if (error) throw error

      const rows = (events ?? []) as EventRow[]
      if (rows.length === 0) return []

      const eventIds = rows.map((e) => e.id)

      const [{ data: attendees }, { data: photos }] = await Promise.all([
        supabase
          .from('event_attendees')
          .select(`*, profiles:user_id(${PROFILE_REF})`)
          .in('event_id', eventIds)
          .eq('status', 'going'),
        supabase
          .from('event_photos')
          .select('*')
          .in('event_id', eventIds)
          .order('created_at', { ascending: false }),
      ])

      return rows.map((event) => ({
        event,
        attendees: (attendees ?? []).filter((a) => a.event_id === event.id),
        photos: ((photos ?? []) as EventPhoto[]).filter((p) => p.event_id === event.id),
      }))
    },
  })
}

export function useEventExpenses(eventId: string | undefined) {
  return useQuery({
    queryKey: ['event-expenses', eventId],
    enabled: !!eventId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('event_expenses')
        .select(
          `*, profiles:paid_by(${PROFILE_REF}), expense_participants(*, profiles:user_id(${PROFILE_REF}))`,
        )
        .eq('event_id', eventId!)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as EventExpense[]
    },
  })
}

export function useCreateExpense(eventId: string) {
  const qc = useQueryClient()
  const { profile } = useAuth()
  return useMutation({
    mutationFn: async (payload: {
      description: string
      amount: number
      participantIds: string[]
    }) => {
      if (!profile) throw new Error('Não autenticado')
      const description = payload.description.trim()
      if (!description) throw new Error('Descrição obrigatória')
      if (!(payload.amount > 0)) throw new Error('Valor inválido')

      const { data: expense, error } = await supabase
        .from('event_expenses')
        .insert({
          event_id: eventId,
          description,
          amount: payload.amount,
          paid_by: profile.id,
        })
        .select()
        .single()
      if (error) throw error

      const ids = payload.participantIds.length > 0 ? payload.participantIds : [profile.id]
      const share = Math.round((payload.amount / ids.length) * 100) / 100
      const rows = ids.map((user_id, index) => ({
        expense_id: expense.id,
        user_id,
        share_amount:
          index === ids.length - 1
            ? Math.round((payload.amount - share * (ids.length - 1)) * 100) / 100
            : share,
      }))

      const { error: partError } = await supabase.from('expense_participants').insert(rows)
      if (partError) {
        await supabase.from('event_expenses').delete().eq('id', expense.id)
        throw partError
      }
      return expense as EventExpense
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['event-expenses', eventId] })
      qc.invalidateQueries({ queryKey: ['group-stats'] })
      qc.invalidateQueries({ queryKey: ['my-badges'] })
    },
  })
}

export function useDeleteExpense(eventId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (expenseId: string) => {
      const { error } = await supabase.from('event_expenses').delete().eq('id', expenseId)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['event-expenses', eventId] })
      qc.invalidateQueries({ queryKey: ['group-stats'] })
      qc.invalidateQueries({ queryKey: ['my-badges'] })
    },
  })
}

export function useNotifications() {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['notifications', profile?.id],
    enabled: !!profile?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('id, user_id, type, title, message, read, event_id, created_at')
        .eq('user_id', profile!.id)
        .order('created_at', { ascending: false })
        .limit(50)
      if (error) throw error
      return (Array.isArray(data) ? data : []) as AppNotification[]
    },
  })
}

export function useMarkNotificationsRead() {
  const qc = useQueryClient()
  const { profile } = useAuth()
  return useMutation({
    mutationFn: async (ids?: string[] | null) => {
      const { data, error } = await supabase.rpc('mark_notifications_read', {
        p_ids: ids ?? null,
      })
      if (error) throw error
      return data as number
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications', profile?.id] }),
  })
}

export function useGroupStats(groupId: string | null | undefined) {
  return useQuery({
    queryKey: ['group-stats', groupId],
    enabled: !!groupId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_group_stats', { p_group_id: groupId! })
      if (error) throw error
      return data as GroupStats
    },
  })
}

export function useMyBadges(groupId: string | null | undefined) {
  return useQuery({
    queryKey: ['my-badges', groupId],
    enabled: !!groupId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_my_badges', { p_group_id: groupId! })
      if (error) throw error
      return data as UserBadge[]
    },
  })
}

/** Mantém queries frescas via Supabase Realtime (MVP 4). */
export function useEventRealtime(eventId: string | undefined) {
  const qc = useQueryClient()
  useEffect(() => {
    if (!eventId) return
    const channel = supabase
      .channel(`event-${eventId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'event_comments', filter: `event_id=eq.${eventId}` },
        () => {
          void qc.invalidateQueries({ queryKey: ['event-comments', eventId] })
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'event_attendees', filter: `event_id=eq.${eventId}` },
        () => {
          void qc.invalidateQueries({ queryKey: ['attendees', eventId] })
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'event_expenses', filter: `event_id=eq.${eventId}` },
        () => {
          void qc.invalidateQueries({ queryKey: ['event-expenses', eventId] })
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [eventId, qc])
}

export function useNotificationsRealtime() {
  const qc = useQueryClient()
  const { profile } = useAuth()
  useEffect(() => {
    if (!profile?.id) return
    const channel = supabase
      .channel(`notifications-${profile.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${profile.id}`,
        },
        () => {
          void qc.invalidateQueries({ queryKey: ['notifications', profile.id] })
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [profile?.id, qc])
}
