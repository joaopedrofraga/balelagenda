-- RLS policies — segurança no Postgres (sem BFF)

alter table public.profiles enable row level security;
alter table public.invites enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.events enable row level security;
alter table public.event_attendees enable row level security;
alter table public.outing_ideas enable row level security;
alter table public.outing_history enable row level security;

-- Helpers
create or replace function public.is_active_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.active = true
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.active = true and p.role = 'admin'
  );
$$;

create or replace function public.is_group_member(p_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.group_members gm
    join public.profiles p on p.id = gm.user_id
    where gm.group_id = p_group_id
      and gm.user_id = auth.uid()
      and gm.active = true
      and p.active = true
  );
$$;

-- profiles
create policy profiles_select_active on public.profiles
for select to authenticated
using (
  public.is_active_user()
  or id = auth.uid()
);

create policy profiles_update_self on public.profiles
for update to authenticated
using (id = auth.uid() and public.is_active_user())
with check (id = auth.uid());

create policy profiles_admin_update on public.profiles
for update to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy profiles_admin_insert on public.profiles
for insert to authenticated
with check (public.is_admin() or id = auth.uid());

-- invites
create policy invites_admin_all on public.invites
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

-- groups
create policy groups_select on public.groups
for select to authenticated
using (public.is_group_member(id) or public.is_admin());

create policy groups_admin_write on public.groups
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

-- group_members
create policy group_members_select on public.group_members
for select to authenticated
using (public.is_group_member(group_id) or public.is_admin());

create policy group_members_admin_write on public.group_members
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

-- events
create policy events_select on public.events
for select to authenticated
using (public.is_group_member(group_id));

create policy events_insert on public.events
for insert to authenticated
with check (public.is_group_member(group_id) and created_by = auth.uid());

create policy events_update on public.events
for update to authenticated
using (public.is_group_member(group_id))
with check (public.is_group_member(group_id));

-- event_attendees
create policy attendees_select on public.event_attendees
for select to authenticated
using (
  exists (
    select 1 from public.events e
    where e.id = event_id and public.is_group_member(e.group_id)
  )
);

create policy attendees_upsert on public.event_attendees
for insert to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.events e
    where e.id = event_id and public.is_group_member(e.group_id)
  )
);

create policy attendees_update on public.event_attendees
for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- outing_ideas
create policy ideas_select on public.outing_ideas
for select to authenticated
using (public.is_group_member(group_id));

create policy ideas_insert on public.outing_ideas
for insert to authenticated
with check (public.is_group_member(group_id) and created_by = auth.uid());

create policy ideas_update on public.outing_ideas
for update to authenticated
using (public.is_group_member(group_id))
with check (public.is_group_member(group_id));

-- outing_history
create policy history_select on public.outing_history
for select to authenticated
using (public.is_group_member(group_id));

create policy history_insert on public.outing_history
for insert to authenticated
with check (public.is_group_member(group_id));

-- Impede desativar o último admin ativo
create or replace function public.prevent_last_admin_deactivate()
returns trigger
language plpgsql
as $$
begin
  if old.role = 'admin' and old.active = true
     and (new.active = false or new.role <> 'admin') then
    if (
      select count(*) from public.profiles
      where role = 'admin' and active = true and id <> old.id
    ) = 0 then
      raise exception 'Não é permitido desativar o último administrador ativo';
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_prevent_last_admin
before update on public.profiles
for each row execute function public.prevent_last_admin_deactivate();
