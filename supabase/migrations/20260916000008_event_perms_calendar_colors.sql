-- Event edit/delete permissions (creator or admin) + calendar colors + event scope

-- ---------------------------------------------------------------------------
-- Schema: colors + event scope
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column if not exists calendar_color text not null default '#7dd3fc';

alter table public.groups
  add column if not exists calendar_color text not null default '#c8f542';

alter table public.events
  add column if not exists scope text not null default 'individual';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'events_scope_check'
      and conrelid = 'public.events'::regclass
  ) then
    alter table public.events
      add constraint events_scope_check
      check (scope in ('individual', 'group'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_calendar_color_hex'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_calendar_color_hex
      check (calendar_color ~ '^#[0-9A-Fa-f]{6}$');
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'groups_calendar_color_hex'
      and conrelid = 'public.groups'::regclass
  ) then
    alter table public.groups
      add constraint groups_calendar_color_hex
      check (calendar_color ~ '^#[0-9A-Fa-f]{6}$');
  end if;
end $$;

comment on column public.profiles.calendar_color is
  'Hex color (#RRGGBB) shown on calendar for individual events created by this user.';
comment on column public.groups.calendar_color is
  'Hex color (#RRGGBB) used for events with scope=group.';
comment on column public.events.scope is
  'individual = compromisso do criador (usa cor do perfil); group = evento do grupo (usa cor do grupo).';

-- ---------------------------------------------------------------------------
-- Column privileges
-- ---------------------------------------------------------------------------

grant select (calendar_color) on table public.profiles to authenticated;
grant update (calendar_color) on table public.profiles to authenticated;

-- ---------------------------------------------------------------------------
-- RLS: events — only creator or admin may update/delete
-- ---------------------------------------------------------------------------

drop policy if exists events_update on public.events;
create policy events_update on public.events
for update to authenticated
using (
  public.is_group_member(group_id)
  and (created_by = auth.uid() or public.is_admin())
)
with check (
  public.is_group_member(group_id)
  and (created_by = auth.uid() or public.is_admin())
);

drop policy if exists events_delete on public.events;
create policy events_delete on public.events
for delete to authenticated
using (
  public.is_group_member(group_id)
  and (created_by = auth.uid() or public.is_admin())
);

-- profiles: self can update own calendar_color (existing profiles_update_self covers it
-- once column is granted). Admin update policy already allows admin edits.

-- groups calendar_color: only admin via existing groups_admin_write policy.
