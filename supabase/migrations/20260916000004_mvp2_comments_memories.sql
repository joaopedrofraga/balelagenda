-- MVP 2: comentários, votos, histórico de eventos, fotos (Storage) e memórias

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.event_comments (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  message text not null check (char_length(trim(message)) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.outing_votes (
  id uuid primary key default gen_random_uuid(),
  outing_idea_id uuid not null references public.outing_ideas (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (outing_idea_id, user_id)
);

create table public.event_history (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  changed_by uuid references public.profiles (id) on delete set null,
  action text not null check (action in ('created', 'edited', 'cancelled', 'restored', 'completed')),
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);

create table public.event_photos (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  uploaded_by uuid not null references public.profiles (id) on delete cascade,
  storage_path text not null,
  caption text,
  created_at timestamptz not null default now()
);

create index event_comments_event_idx on public.event_comments (event_id, created_at);
create index outing_votes_idea_idx on public.outing_votes (outing_idea_id);
create index event_history_event_idx on public.event_history (event_id, created_at desc);
create index event_photos_event_idx on public.event_photos (event_id, created_at);
create index events_status_start_idx on public.events (status, start_at desc);

create trigger event_comments_updated_at before update on public.event_comments
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.is_event_group_member(p_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.events e
    where e.id = p_event_id
      and public.is_group_member(e.group_id)
  );
$$;

create or replace function public.is_idea_group_member(p_idea_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.outing_ideas i
    where i.id = p_idea_id
      and public.is_group_member(i.group_id)
  );
$$;

-- ---------------------------------------------------------------------------
-- Event history trigger
-- ---------------------------------------------------------------------------

create or replace function public.log_event_history()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_action text;
  v_old jsonb;
  v_new jsonb;
begin
  if tg_op = 'INSERT' then
    insert into public.event_history (event_id, changed_by, action, old_data, new_data)
    values (
      new.id,
      coalesce(auth.uid(), new.created_by),
      'created',
      null,
      to_jsonb(new)
    );
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if old.status is distinct from new.status and new.status = 'cancelled' then
      v_action := 'cancelled';
    elsif old.status = 'cancelled' and new.status is distinct from old.status then
      v_action := 'restored';
    elsif old.status is distinct from new.status and new.status = 'completed' then
      v_action := 'completed';
    else
      v_action := 'edited';
    end if;

    v_old := to_jsonb(old);
    v_new := to_jsonb(new);

    -- Evita spam se nada relevante mudou além de updated_at
    if v_action = 'edited'
       and (v_old - 'updated_at') = (v_new - 'updated_at') then
      return new;
    end if;

    insert into public.event_history (event_id, changed_by, action, old_data, new_data)
    values (
      new.id,
      auth.uid(),
      v_action,
      v_old,
      v_new
    );
    return new;
  end if;

  return new;
end;
$$;

create trigger trg_event_history
after insert or update on public.events
for each row execute function public.log_event_history();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.event_comments enable row level security;
alter table public.outing_votes enable row level security;
alter table public.event_history enable row level security;
alter table public.event_photos enable row level security;

-- comments
create policy comments_select on public.event_comments
for select to authenticated
using (public.is_event_group_member(event_id));

create policy comments_insert on public.event_comments
for insert to authenticated
with check (
  user_id = auth.uid()
  and public.is_active_user()
  and public.is_event_group_member(event_id)
);

create policy comments_update on public.event_comments
for update to authenticated
using (user_id = auth.uid() and public.is_active_user())
with check (user_id = auth.uid());

create policy comments_delete on public.event_comments
for delete to authenticated
using (user_id = auth.uid() or public.is_admin());

-- votes
create policy votes_select on public.outing_votes
for select to authenticated
using (public.is_idea_group_member(outing_idea_id));

create policy votes_insert on public.outing_votes
for insert to authenticated
with check (
  user_id = auth.uid()
  and public.is_active_user()
  and public.is_idea_group_member(outing_idea_id)
);

create policy votes_delete on public.outing_votes
for delete to authenticated
using (user_id = auth.uid());

-- history (read-only for clients; writes via trigger/security definer)
create policy history_select on public.event_history
for select to authenticated
using (public.is_event_group_member(event_id));

-- photos metadata
create policy photos_select on public.event_photos
for select to authenticated
using (public.is_event_group_member(event_id));

create policy photos_insert on public.event_photos
for insert to authenticated
with check (
  uploaded_by = auth.uid()
  and public.is_active_user()
  and public.is_event_group_member(event_id)
);

create policy photos_delete on public.event_photos
for delete to authenticated
using (uploaded_by = auth.uid() or public.is_admin());

-- ---------------------------------------------------------------------------
-- Storage bucket + policies
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'event-photos',
  'event-photos',
  true,
  5242880, -- 5 MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy event_photos_storage_select on storage.objects
for select to authenticated, anon
using (bucket_id = 'event-photos');

create policy event_photos_storage_insert on storage.objects
for insert to authenticated
with check (
  bucket_id = 'event-photos'
  and public.is_active_user()
  and public.is_event_group_member(((storage.foldername(name))[1])::uuid)
);

create policy event_photos_storage_delete on storage.objects
for delete to authenticated
using (
  bucket_id = 'event-photos'
  and (
    owner = auth.uid()
    or public.is_admin()
    or public.is_event_group_member(((storage.foldername(name))[1])::uuid)
  )
);
