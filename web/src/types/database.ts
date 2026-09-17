export type UserRole = 'admin' | 'user'
export type GroupRole = 'owner' | 'admin' | 'member'
export type EventStatus = 'planned' | 'confirmed' | 'cancelled' | 'completed'
export type EventScope = 'individual' | 'group'
export type AttendanceStatus = 'going' | 'maybe' | 'not_going'
export type EventHistoryAction = 'created' | 'edited' | 'cancelled' | 'restored' | 'completed'

export type Profile = {
  id: string
  name: string
  username: string
  email: string | null
  role: UserRole
  active: boolean
  avatar_path: string | null
  calendar_color: string
  created_at: string
  updated_at: string
  last_login_at: string | null
}
/** password_hash exists only no servidor — nunca tipar/selecionar no client. */

/** Nested profile fields commonly selected with related rows */
export type ProfileRef = Pick<Profile, 'id' | 'name' | 'username' | 'avatar_path' | 'calendar_color'>

export type Group = {
  id: string
  name: string
  description: string | null
  created_by: string | null
  calendar_color: string
  created_at: string
  updated_at: string
}

export type GroupMember = {
  id: string
  group_id: string
  user_id: string
  role: GroupRole
  joined_at: string
  active: boolean
  profiles?: Profile
}

export type EventRow = {
  id: string
  group_id: string
  title: string
  description: string | null
  start_at: string
  end_at: string | null
  location_name: string | null
  category: string | null
  notes: string | null
  max_participants: number | null
  status: EventStatus
  scope: EventScope
  created_by: string
  created_at: string
  updated_at: string
  profiles?: ProfileRef
}

export type EventAttendee = {
  id: string
  event_id: string
  user_id: string
  status: AttendanceStatus
  updated_at: string
  profiles?: ProfileRef
}

export type OutingPeriod = 'morning' | 'afternoon' | 'night' | 'any'

export type OutingIdea = {
  id: string
  group_id: string
  title: string
  description: string | null
  category: string | null
  estimated_cost: number | null
  period: OutingPeriod | null
  ambiance: string | null
  created_by: string
  active: boolean
  created_at: string
}

export type EventComment = {
  id: string
  event_id: string
  user_id: string
  message: string
  created_at: string
  updated_at: string
  profiles?: ProfileRef
}

export type OutingVote = {
  id: string
  outing_idea_id: string
  user_id: string
  created_at: string
}

export type EventHistory = {
  id: string
  event_id: string
  changed_by: string | null
  action: EventHistoryAction
  old_data: Record<string, unknown> | null
  new_data: Record<string, unknown> | null
  created_at: string
  profiles?: ProfileRef | null
}

export type EventPhoto = {
  id: string
  event_id: string
  uploaded_by: string
  storage_path: string
  caption: string | null
  created_at: string
  profiles?: ProfileRef
}

export type EventExpense = {
  id: string
  event_id: string
  description: string
  amount: number
  paid_by: string
  created_at: string
  profiles?: ProfileRef
  expense_participants?: ExpenseParticipant[]
}

export type ExpenseParticipant = {
  id: string
  expense_id: string
  user_id: string
  share_amount: number | null
  created_at: string
  profiles?: ProfileRef
}

export type AppNotification = {
  id: string
  user_id: string
  type: string
  title: string
  message: string
  read: boolean
  event_id: string | null
  created_at: string
}

export type GroupStatsPerson = {
  id: string
  name: string
  username: string
  avatar_path?: string | null
  going_count?: number
  events_created?: number
}

export type GroupStats = {
  events_total: number
  events_planned: number
  events_completed: number
  events_cancelled: number
  ideas_active: number
  votes_total: number
  comments_total: number
  photos_total: number
  expenses_total: number
  expenses_count: number
  members_active: number
  attendance_going: number
  top_attendees: GroupStatsPerson[]
  top_creators: GroupStatsPerson[]
}

export type UserBadge = {
  id: string
  label: string
  description: string
  earned: boolean
  progress: number
  target: number
}

export type Database = {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Partial<Profile> & Pick<Profile, 'id' | 'name' | 'username'>; Update: Partial<Profile> }
      groups: { Row: Group; Insert: Partial<Group>; Update: Partial<Group> }
      group_members: { Row: GroupMember; Insert: Partial<GroupMember>; Update: Partial<GroupMember> }
      events: { Row: EventRow; Insert: Partial<EventRow> & Pick<EventRow, 'group_id' | 'title' | 'start_at' | 'created_by'>; Update: Partial<EventRow> }
      event_attendees: { Row: EventAttendee; Insert: Partial<EventAttendee> & Pick<EventAttendee, 'event_id' | 'user_id' | 'status'>; Update: Partial<EventAttendee> }
      outing_ideas: { Row: OutingIdea; Insert: Partial<OutingIdea> & Pick<OutingIdea, 'group_id' | 'title' | 'created_by'>; Update: Partial<OutingIdea> }
      outing_history: { Row: { id: string; group_id: string; outing_idea_id: string; event_id: string | null; selected_at: string }; Insert: Partial<{ id: string; group_id: string; outing_idea_id: string; event_id: string | null; selected_at: string }>; Update: never }
      event_comments: { Row: EventComment; Insert: Partial<EventComment> & Pick<EventComment, 'event_id' | 'user_id' | 'message'>; Update: Partial<EventComment> }
      outing_votes: { Row: OutingVote; Insert: Partial<OutingVote> & Pick<OutingVote, 'outing_idea_id' | 'user_id'>; Update: never }
      event_history: { Row: EventHistory; Insert: Partial<EventHistory> & Pick<EventHistory, 'event_id' | 'action'>; Update: never }
      event_photos: { Row: EventPhoto; Insert: Partial<EventPhoto> & Pick<EventPhoto, 'event_id' | 'uploaded_by' | 'storage_path'>; Update: Partial<EventPhoto> }
      event_expenses: {
        Row: EventExpense
        Insert: Partial<EventExpense> & Pick<EventExpense, 'event_id' | 'description' | 'amount' | 'paid_by'>
        Update: Partial<EventExpense>
      }
      expense_participants: {
        Row: ExpenseParticipant
        Insert: Partial<ExpenseParticipant> & Pick<ExpenseParticipant, 'expense_id' | 'user_id'>
        Update: Partial<ExpenseParticipant>
      }
      notifications: {
        Row: AppNotification
        Insert: Partial<AppNotification> & Pick<AppNotification, 'user_id' | 'type' | 'title' | 'message'>
        Update: Partial<AppNotification>
      }
    }
    Functions: {
      touch_last_login: { Args: Record<string, never>; Returns: void }
      draw_outing_idea: {
        Args: {
          p_group_id: string
          p_category?: string | null
          p_max_cost?: number | null
          p_period?: string | null
          p_ambiance?: string | null
          p_avoid_recent_days?: number | null
        }
        Returns: OutingIdea
      }
      mark_notifications_read: { Args: { p_ids?: string[] | null }; Returns: number }
      get_group_stats: { Args: { p_group_id: string }; Returns: GroupStats }
      get_my_badges: { Args: { p_group_id: string }; Returns: UserBadge[] }
    }
  }
}
