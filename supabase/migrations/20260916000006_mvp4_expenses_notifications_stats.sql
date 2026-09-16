-- MVP 4: despesas, notificações, realtime, estatísticas e badges (RPC)

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.event_expenses (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  description text not null check (char_length(trim(description)) > 0),
  amount numeric(12, 2) not null check (amount > 0),
  paid_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.expense_participants (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid not null references public.event_expenses (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  share_amount numeric(12, 2) check (share_amount is null or share_amount >= 0),
  created_at timestamptz not null default now(),
  unique (expense_id, user_id)
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null check (char_length(trim(type)) > 0),
  title text not null,
  message text not null,
  read boolean not null default false,
  event_id uuid references public.events (id) on delete set null,
  created_at timestamptz not null default now()
);

create index event_expenses_event_idx on public.event_expenses (event_id, created_at desc);
create index expense_participants_expense_idx on public.expense_participants (expense_id);
create index expense_participants_user_idx on public.expense_participants (user_id);
create index notifications_user_created_idx on public.notifications (user_id, created_at desc);
create index notifications_user_unread_idx on public.notifications (user_id) where read = false;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.notify_group_members(
  p_group_id uuid,
  p_type text,
  p_title text,
  p_message text,
  p_event_id uuid default null,
  p_exclude_user_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (user_id, type, title, message, event_id)
  select gm.user_id, p_type, p_title, p_message, p_event_id
  from public.group_members gm
  join public.profiles p on p.id = gm.user_id
  where gm.group_id = p_group_id
    and gm.active = true
    and p.active = true
    and (p_exclude_user_id is null or gm.user_id <> p_exclude_user_id);
end;
$$;

create or replace function public.trg_notify_event_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
begin
  select name into v_name from public.profiles where id = new.created_by;
  perform public.notify_group_members(
    new.group_id,
    'event_created',
    'Novo evento',
    coalesce(v_name, 'Alguém') || ' criou o evento "' || new.title || '".',
    new.id,
    new.created_by
  );
  return new;
end;
$$;

create or replace function public.trg_notify_event_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
  v_actor uuid;
  v_msg text;
begin
  if old.start_at is not distinct from new.start_at
     and old.status is not distinct from new.status
     and old.location_name is not distinct from new.location_name
     and old.title is not distinct from new.title then
    return new;
  end if;

  v_actor := auth.uid();
  select name into v_name from public.profiles where id = coalesce(v_actor, new.created_by);

  if old.status is distinct from new.status and new.status = 'cancelled' then
    v_msg := coalesce(v_name, 'Alguém') || ' cancelou "' || new.title || '".';
    perform public.notify_group_members(
      new.group_id, 'event_cancelled', 'Evento cancelado', v_msg, new.id, v_actor
    );
  elsif old.status is distinct from new.status and new.status = 'completed' then
    v_msg := coalesce(v_name, 'Alguém') || ' marcou "' || new.title || '" como memória.';
    perform public.notify_group_members(
      new.group_id, 'event_completed', 'Nova memória', v_msg, new.id, v_actor
    );
  elsif old.start_at is distinct from new.start_at
        or old.location_name is distinct from new.location_name
        or old.title is distinct from new.title then
    v_msg := coalesce(v_name, 'Alguém') || ' alterou o evento "' || new.title || '".';
    perform public.notify_group_members(
      new.group_id, 'event_updated', 'Evento atualizado', v_msg, new.id, v_actor
    );
  end if;

  return new;
end;
$$;

create or replace function public.trg_notify_comment_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
  v_title text;
  v_group uuid;
  v_creator uuid;
begin
  select e.title, e.group_id, e.created_by
    into v_title, v_group, v_creator
  from public.events e
  where e.id = new.event_id;

  select name into v_name from public.profiles where id = new.user_id;

  insert into public.notifications (user_id, type, title, message, event_id)
  select distinct targets.uid,
         'event_comment',
         'Novo comentário',
         coalesce(v_name, 'Alguém') || ' comentou em "' || coalesce(v_title, 'evento') || '".',
         new.event_id
  from (
    select v_creator as uid
    where v_creator is not null and v_creator <> new.user_id
    union
    select ea.user_id
    from public.event_attendees ea
    where ea.event_id = new.event_id
      and ea.status = 'going'
      and ea.user_id <> new.user_id
  ) targets;

  return new;
end;
$$;

create or replace function public.trg_notify_expense_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
  v_title text;
  v_group uuid;
begin
  select e.title, e.group_id into v_title, v_group
  from public.events e where e.id = new.event_id;

  select name into v_name from public.profiles where id = new.paid_by;

  perform public.notify_group_members(
    v_group,
    'expense_added',
    'Nova despesa',
    coalesce(v_name, 'Alguém') || ' registrou R$ ' || trim(to_char(new.amount, 'FM999999990.00'))
      || ' em "' || coalesce(v_title, 'evento') || '": ' || new.description || '.',
    new.event_id,
    new.paid_by
  );
  return new;
end;
$$;

create trigger trg_notify_event_insert
after insert on public.events
for each row execute function public.trg_notify_event_insert();

create trigger trg_notify_event_update
after update on public.events
for each row execute function public.trg_notify_event_update();

create trigger trg_notify_comment_insert
after insert on public.event_comments
for each row execute function public.trg_notify_comment_insert();

create trigger trg_notify_expense_insert
after insert on public.event_expenses
for each row execute function public.trg_notify_expense_insert();

-- ---------------------------------------------------------------------------
-- RPCs
-- ---------------------------------------------------------------------------

create or replace function public.mark_notifications_read(p_ids uuid[] default null)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  if auth.uid() is null or not public.is_active_user() then
    raise exception 'not authenticated';
  end if;

  if p_ids is null then
    update public.notifications
    set read = true
    where user_id = auth.uid() and read = false;
  else
    update public.notifications
    set read = true
    where user_id = auth.uid() and id = any(p_ids) and read = false;
  end if;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

create or replace function public.get_group_stats(p_group_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  if not public.is_group_member(p_group_id) and not public.is_admin() then
    raise exception 'forbidden';
  end if;

  select jsonb_build_object(
    'events_total', (select count(*) from public.events e where e.group_id = p_group_id),
    'events_planned', (select count(*) from public.events e where e.group_id = p_group_id and e.status in ('planned', 'confirmed')),
    'events_completed', (select count(*) from public.events e where e.group_id = p_group_id and e.status = 'completed'),
    'events_cancelled', (select count(*) from public.events e where e.group_id = p_group_id and e.status = 'cancelled'),
    'ideas_active', (select count(*) from public.outing_ideas i where i.group_id = p_group_id and i.active),
    'votes_total', (
      select count(*) from public.outing_votes v
      join public.outing_ideas i on i.id = v.outing_idea_id
      where i.group_id = p_group_id
    ),
    'comments_total', (
      select count(*) from public.event_comments c
      join public.events e on e.id = c.event_id
      where e.group_id = p_group_id
    ),
    'photos_total', (
      select count(*) from public.event_photos p
      join public.events e on e.id = p.event_id
      where e.group_id = p_group_id
    ),
    'expenses_total', (
      select coalesce(sum(x.amount), 0) from public.event_expenses x
      join public.events e on e.id = x.event_id
      where e.group_id = p_group_id
    ),
    'expenses_count', (
      select count(*) from public.event_expenses x
      join public.events e on e.id = x.event_id
      where e.group_id = p_group_id
    ),
    'members_active', (
      select count(*) from public.group_members gm
      where gm.group_id = p_group_id and gm.active
    ),
    'attendance_going', (
      select count(*) from public.event_attendees a
      join public.events e on e.id = a.event_id
      where e.group_id = p_group_id and a.status = 'going'
    ),
    'top_attendees', (
      select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb)
      from (
        select p.id, p.name, p.username, count(*)::int as going_count
        from public.event_attendees a
        join public.events e on e.id = a.event_id
        join public.profiles p on p.id = a.user_id
        where e.group_id = p_group_id and a.status = 'going'
        group by p.id, p.name, p.username
        order by going_count desc, p.name
        limit 5
      ) t
    ),
    'top_creators', (
      select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb)
      from (
        select p.id, p.name, p.username, count(*)::int as events_created
        from public.events e
        join public.profiles p on p.id = e.created_by
        where e.group_id = p_group_id
        group by p.id, p.name, p.username
        order by events_created desc, p.name
        limit 5
      ) t
    )
  ) into v_result;

  return v_result;
end;
$$;

create or replace function public.get_my_badges(p_group_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_events_created int;
  v_going int;
  v_ideas int;
  v_comments int;
  v_photos int;
  v_expenses_paid int;
  v_votes_received int;
begin
  if v_uid is null or not public.is_active_user() then
    raise exception 'not authenticated';
  end if;
  if not public.is_group_member(p_group_id) and not public.is_admin() then
    raise exception 'forbidden';
  end if;

  select count(*) into v_events_created
  from public.events e where e.group_id = p_group_id and e.created_by = v_uid;

  select count(*) into v_going
  from public.event_attendees a
  join public.events e on e.id = a.event_id
  where e.group_id = p_group_id and a.user_id = v_uid and a.status = 'going';

  select count(*) into v_ideas
  from public.outing_ideas i where i.group_id = p_group_id and i.created_by = v_uid and i.active;

  select count(*) into v_comments
  from public.event_comments c
  join public.events e on e.id = c.event_id
  where e.group_id = p_group_id and c.user_id = v_uid;

  select count(*) into v_photos
  from public.event_photos p
  join public.events e on e.id = p.event_id
  where e.group_id = p_group_id and p.uploaded_by = v_uid;

  select count(*) into v_expenses_paid
  from public.event_expenses x
  join public.events e on e.id = x.event_id
  where e.group_id = p_group_id and x.paid_by = v_uid;

  select count(*) into v_votes_received
  from public.outing_votes v
  join public.outing_ideas i on i.id = v.outing_idea_id
  where i.group_id = p_group_id and i.created_by = v_uid;

  return jsonb_build_array(
    jsonb_build_object(
      'id', 'primeiro_role',
      'label', 'Primeiro rolê',
      'description', 'Participou ou criou o primeiro evento',
      'earned', (v_events_created >= 1 or v_going >= 1),
      'progress', case when v_events_created >= 1 or v_going >= 1 then 1 else 0 end,
      'target', 1
    ),
    jsonb_build_object(
      'id', 'anfitriao',
      'label', 'Anfitrião',
      'description', 'Criou 3 ou mais eventos',
      'earned', v_events_created >= 3,
      'progress', least(v_events_created, 3),
      'target', 3
    ),
    jsonb_build_object(
      'id', 'presente_fiel',
      'label', 'Presente fiel',
      'description', 'Confirmou presença em 5 rolês',
      'earned', v_going >= 5,
      'progress', least(v_going, 5),
      'target', 5
    ),
    jsonb_build_object(
      'id', 'ideia_boa',
      'label', 'Ideia boa',
      'description', 'Cadastrou 3 ideias ativas',
      'earned', v_ideas >= 3,
      'progress', least(v_ideas, 3),
      'target', 3
    ),
    jsonb_build_object(
      'id', 'comentarista',
      'label', 'Comentarista',
      'description', 'Fez 10 comentários',
      'earned', v_comments >= 10,
      'progress', least(v_comments, 10),
      'target', 10
    ),
    jsonb_build_object(
      'id', 'fotografo',
      'label', 'Fotógrafo',
      'description', 'Enviou 5 fotos',
      'earned', v_photos >= 5,
      'progress', least(v_photos, 5),
      'target', 5
    ),
    jsonb_build_object(
      'id', 'caixa',
      'label', 'Caixa do rolê',
      'description', 'Registrou 3 despesas pagas',
      'earned', v_expenses_paid >= 3,
      'progress', least(v_expenses_paid, 3),
      'target', 3
    ),
    jsonb_build_object(
      'id', 'popular',
      'label', 'Popular',
      'description', 'Recebeu 5 votos nas suas ideias',
      'earned', v_votes_received >= 5,
      'progress', least(v_votes_received, 5),
      'target', 5
    )
  );
end;
$$;

grant execute on function public.mark_notifications_read(uuid[]) to authenticated;
grant execute on function public.get_group_stats(uuid) to authenticated;
grant execute on function public.get_my_badges(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.event_expenses enable row level security;
alter table public.expense_participants enable row level security;
alter table public.notifications enable row level security;

create policy expenses_select on public.event_expenses
for select to authenticated
using (public.is_event_group_member(event_id));

create policy expenses_insert on public.event_expenses
for insert to authenticated
with check (
  paid_by = auth.uid()
  and public.is_active_user()
  and public.is_event_group_member(event_id)
);

create policy expenses_update on public.event_expenses
for update to authenticated
using (paid_by = auth.uid() or public.is_admin())
with check (paid_by = auth.uid() or public.is_admin());

create policy expenses_delete on public.event_expenses
for delete to authenticated
using (paid_by = auth.uid() or public.is_admin());

create policy expense_participants_select on public.expense_participants
for select to authenticated
using (
  exists (
    select 1 from public.event_expenses x
    where x.id = expense_id and public.is_event_group_member(x.event_id)
  )
);

create policy expense_participants_insert on public.expense_participants
for insert to authenticated
with check (
  public.is_active_user()
  and exists (
    select 1 from public.event_expenses x
    where x.id = expense_id
      and public.is_event_group_member(x.event_id)
      and (x.paid_by = auth.uid() or public.is_admin())
  )
);

create policy expense_participants_delete on public.expense_participants
for delete to authenticated
using (
  exists (
    select 1 from public.event_expenses x
    where x.id = expense_id
      and (x.paid_by = auth.uid() or public.is_admin())
  )
);

create policy notifications_select on public.notifications
for select to authenticated
using (user_id = auth.uid());

create policy notifications_update on public.notifications
for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- inserts via security definer triggers only
create policy notifications_insert_deny on public.notifications
for insert to authenticated
with check (false);

-- ---------------------------------------------------------------------------
-- Realtime
-- ---------------------------------------------------------------------------

do $$
begin
  alter publication supabase_realtime add table public.notifications;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.event_comments;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.event_attendees;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.event_expenses;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;
