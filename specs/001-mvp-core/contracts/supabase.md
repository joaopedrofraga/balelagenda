# Contracts: Supabase Client Operations

Base: `@supabase/supabase-js` with anon key. All mutations subject to RLS.

## Auth

- `signInWithPassword({ email, password })`
- Username path: RPC `resolve_login_email(p_username)` → email → signIn
- `signUp({ email, password })` then RPC/trigger attaches profile from invite
- `signOut()`, `onAuthStateChange`, `getSession()`

## Profiles / Admin

- `from('profiles').select()` — admin lists all; users read self + group peers via RLS
- `from('profiles').update({ name, active, role })` — admin only (RLS)
- `from('profiles').update({ avatar_path })` — self (RLS) + `storage.from('avatars').upload/remove`
- `from('invites').insert(...)` — admin
- Password reset: Supabase `resetPasswordForEmail` (user) or admin asks user to recover (no Admin API)

## Groups

- `from('groups').select()` / `from('group_members').select('*, profiles(*)')`

## Events

- CRUD via `from('events')`; cancel = `update({ status: 'cancelled' })`
- `from('event_attendees').upsert({ event_id, user_id, status })`

## Outing

- `from('outing_ideas').select/insert/update`
- `from('outing_votes').insert/delete` — one vote per user per idea
- RPC `draw_outing_idea(p_group_id)` → idea + insert outing_history
- Create event from idea: `from('events').insert({ title, category, ... })`

## Comments / history / photos / memories

- `from('event_comments').select/insert/delete`
- `from('event_history').select` — written by DB trigger on events
- `from('event_photos').select/insert/delete` + `storage.from('event-photos').upload/remove`
- Memories: `from('events').select(...).eq('status','completed')` + attendees `going` + photos

## Expenses / notifications / stats (MVP 4)

- `from('event_expenses').select/insert/delete` + `from('expense_participants').insert`
- `from('notifications').select` (own rows) + RPC `mark_notifications_read(p_ids?)`
- RPC `get_group_stats(p_group_id)`, `get_my_badges(p_group_id)`
- Realtime: `channel().on('postgres_changes', { table: 'notifications' | 'event_comments' | 'event_attendees' | 'event_expenses' })`

## Env

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```
