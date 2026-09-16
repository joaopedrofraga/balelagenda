# Data Model: Balelagenda MVP Core

## profiles

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | = auth.users.id |
| name | text not null | |
| username | text unique not null | |
| email | text unique | mirror for display/lookup |
| role | text not null | `admin` \| `user` |
| active | boolean not null default true | |
| avatar_path | text null | Storage path in `avatars` bucket |
| created_at / updated_at / last_login_at | timestamptz | |

## invites

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| email | text not null | |
| username | text not null | |
| name | text not null | |
| role | text not null default `user` | |
| token | text unique not null | random |
| created_by | uuid → profiles | |
| used_at | timestamptz null | |
| expires_at | timestamptz | |
| created_at | timestamptz | |

## groups / group_members

Standard shared group; seed one default group. Roles: `owner` \| `admin` \| `member`.

## events

title, description, start_at, end_at, location_name, category, notes, max_participants, status (`planned`\|`confirmed`\|`cancelled`\|`completed`), group_id, created_by, timestamps.

## event_attendees

unique (event_id, user_id); status `going`\|`maybe`\|`not_going`.

## outing_ideas / outing_history

Ideas with active flag; optional `estimated_cost`, `period` (`morning`\|`afternoon`\|`night`\|`any`), `ambiance`.
History records draws (idea_id, group_id, selected_at, event_id nullable).
RPC `draw_outing_idea` accepts optional filters and prefers ideas not drawn in the last N days.

## Edge Function suggest-places (MVP 3)

Not a table: interprets natural-language intent (AI or heuristic) and searches real places via Geoapify. Secrets stay on Supabase.

## event_comments

message text; event_id + user_id; author can update/delete; admin can delete.

## outing_votes

unique (outing_idea_id, user_id) — one vote per user per idea.

## event_history

Append-only audit via trigger on `events` insert/update. Actions: `created` | `edited` | `cancelled` | `restored` | `completed`. Clients read-only.

## event_photos + Storage

Metadata table `event_photos` (storage_path). Bucket `event-photos` (public read, 5 MB, image mime types). Path: `{event_id}/{uuid}.ext`.

## Profile avatars + Storage

`profiles.avatar_path` stores object path in bucket `avatars` (public read, 5 MB, image mime types). Path: `{user_id}/{uuid}.ext`. Authenticated active user uploads/updates/deletes only own folder; admin may delete.

## event_expenses / expense_participants (MVP 4)

`event_expenses`: description, amount, paid_by, event_id.
`expense_participants`: who splits the expense (`share_amount` for equal/custom split). Members of the event group can read; payer (or admin) writes.

## notifications (MVP 4)

In-app notifications per user: type, title, message, read, optional event_id.
Inserted by security-definer triggers (event create/update, comment, expense). Clients read/update own rows; RPC `mark_notifications_read`.

## Stats / badges (MVP 4)

RPC `get_group_stats(group_id)` → aggregates (events, attendance, ideas, votes, comments, photos, expenses, top lists).
RPC `get_my_badges(group_id)` → computed achievement badges for the current user (no persistent badge table).

## Realtime (MVP 4)

Publication includes `notifications`, `event_comments`, `event_attendees`, `event_expenses` for live UI invalidation.

## RLS summary

- Authenticated + `profiles.active` for reads/writes in group.
- Admin-only for invites insert/update and profile role/active changes.
- Members manage events/attendees/ideas/comments/votes/photos/expenses in their groups.
- Notifications: only own rows; inserts via triggers.
- Public (anon): only invite token validation RPC as needed for signup page; public read of photo bucket objects.
