-- Balelagenda: schema inicial (SPA + Supabase Auth + RLS)
-- Auth: auth.users (Supabase). Perfis e domínio na public.

create extension if not exists "pgcrypto";

-- Profiles (1:1 com auth.users)
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  username text not null unique,
  email text unique,
  role text not null check (role in ('admin', 'user')) default 'user',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_login_at timestamptz
);

create table public.invites (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  username text not null,
  name text not null,
  role text not null check (role in ('admin', 'user')) default 'user',
  token text not null unique default encode(gen_random_bytes(24), 'hex'),
  created_by uuid references public.profiles (id),
  used_at timestamptz,
  expires_at timestamptz not null default (now() + interval '14 days'),
  created_at timestamptz not null default now()
);

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'member')) default 'member',
  joined_at timestamptz not null default now(),
  active boolean not null default true,
  unique (group_id, user_id)
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  title text not null,
  description text,
  start_at timestamptz not null,
  end_at timestamptz,
  location_name text,
  category text,
  notes text,
  max_participants int,
  status text not null check (status in ('planned', 'confirmed', 'cancelled', 'completed')) default 'planned',
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.event_attendees (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  status text not null check (status in ('going', 'maybe', 'not_going')),
  updated_at timestamptz not null default now(),
  unique (event_id, user_id)
);

create table public.outing_ideas (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  title text not null,
  description text,
  category text,
  estimated_cost numeric,
  created_by uuid not null references public.profiles (id),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.outing_history (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  outing_idea_id uuid not null references public.outing_ideas (id) on delete cascade,
  event_id uuid references public.events (id),
  selected_at timestamptz not null default now()
);

create index events_group_start_idx on public.events (group_id, start_at);
create index group_members_user_idx on public.group_members (user_id);
create index outing_ideas_group_active_idx on public.outing_ideas (group_id, active);

-- updated_at helper
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at before update on public.profiles
for each row execute function public.set_updated_at();

create trigger groups_updated_at before update on public.groups
for each row execute function public.set_updated_at();

create trigger events_updated_at before update on public.events
for each row execute function public.set_updated_at();
