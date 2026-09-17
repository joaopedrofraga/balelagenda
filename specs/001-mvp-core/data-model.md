# Data Model: Balelagenda MVP Core

## profiles

Tabela de usuários da aplicação (**sem** `auth.users` / Supabase Auth).

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | `gen_random_uuid()` — não referencia `auth.users` |
| name | text not null | |
| username | text unique not null | login |
| email | text unique null | opcional; também serve de login |
| **password_hash** | **text not null** | **bcrypt/argon2; nunca plaintext; nunca SELECT no client** |
| role | text not null | `admin` \| `user` |
| active | boolean not null default true | inativo não autentica / RLS bloqueia |
| avatar_path | text null | Storage path in `avatars` bucket |
| calendar_color | text not null | Hex `#RRGGBB` (default `#7dd3fc`); cor dos compromissos individuais no calendário |
| created_at / updated_at / last_login_at | timestamptz | |

Privileges: `anon`/`authenticated` **não** têm `SELECT`/`UPDATE` em `password_hash`. Leitura/escrita do hash só via **service_role** nas Edge Functions.

Seed do primeiro admin: ver `supabase/seed.sql` (username `admin`, senha documentada + hash bcrypt).

## groups / group_members

Standard shared group; seed one default group. Roles: `owner` \| `admin` \| `member`.
`groups.calendar_color` (hex, default `#c8f542`) — cor dos eventos com `scope=group`; só admin altera.

## events

title, description, start_at, end_at, location_name, category, notes, max_participants, status (`planned`\|`confirmed`\|`cancelled`\|`completed`), **scope** (`individual`\|`group`, default `individual`), group_id, created_by, timestamps.

- `individual` → marcador com `profiles.calendar_color` do criador
- `group` → marcador com `groups.calendar_color`

**Permissão de edição/exclusão (cancelar):** só o **criador** ou **admin** (`profiles.role = admin`).

## event_attendees

unique (event_id, user_id); status `going`\|`maybe`\|`not_going`.

## outing_ideas / outing_history

Ideas with active flag; optional `estimated_cost`, `period` (`morning`\|`afternoon`\|`night`\|`any`), `ambiance`.
History records draws (idea_id, group_id, selected_at, event_id nullable).
RPC `draw_outing_idea` accepts optional filters and prefers ideas not drawn in the last N days.

## Edge Function suggest-places (MVP 3)

Input: free-text prompt and/or structured filters. Output: normalized filters + real places from provider (never invented). Secrets only on the function.

## event_comments / outing_votes / event_history / event_photos

MVP 2 social layer. Photos use Storage bucket `event-photos` + path metadata.

## event_expenses / expense_participants / notifications

MVP 4. Split expenses per event; in-app notifications; stats RPCs.

## Auth model

1. Admin cria usuário (Edge Function) com senha → `password_hash`.
2. Login (Edge Function) valida username/email + hash → JWT HS256.
3. SPA envia `Authorization: Bearer <jwt>` em todas as chamadas PostgREST/Storage/Functions.
4. RLS usa `auth.uid()` (= claim `sub` do JWT).

## Storage

`profiles.avatar_path` stores object path in bucket `avatars` (public read, 5 MB, image mime types). Path: `{user_id}/{uuid}.ext`. Authenticated active user uploads/updates/deletes only own folder; admin may delete.

## RLS summary

- Authenticated + `profiles.active` for reads/writes in group.
- Admin-only for profile role/active changes and user creation (via Functions).
- Event update/delete: **creator or admin** only.
- `profiles.calendar_color`: self (or admin) update; readable by active users.
- `groups.calendar_color`: admin write only (existing `groups_admin_write`).
- `password_hash` inaccessible to browser roles.
- Public (anon): only `login` Edge Function (no open registration).
