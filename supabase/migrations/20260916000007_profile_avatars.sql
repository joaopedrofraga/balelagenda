-- Profile avatars: column on profiles + dedicated Storage bucket

alter table public.profiles
  add column if not exists avatar_path text;

comment on column public.profiles.avatar_path is
  'Path inside the avatars Storage bucket (e.g. {user_id}/{uuid}.ext). Null = no photo.';

-- ---------------------------------------------------------------------------
-- Storage bucket + policies (same pattern as event-photos)
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  5242880, -- 5 MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- Public read so avatar URLs work in the SPA for group peers
create policy avatars_storage_select on storage.objects
for select to authenticated, anon
using (bucket_id = 'avatars');

-- Active user uploads only into their own folder: {user_id}/...
create policy avatars_storage_insert on storage.objects
for insert to authenticated
with check (
  bucket_id = 'avatars'
  and public.is_active_user()
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy avatars_storage_update on storage.objects
for update to authenticated
using (
  bucket_id = 'avatars'
  and public.is_active_user()
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy avatars_storage_delete on storage.objects
for delete to authenticated
using (
  bucket_id = 'avatars'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.is_admin()
  )
);

-- ---------------------------------------------------------------------------
-- Include avatar_path in group stats leaderboards
-- ---------------------------------------------------------------------------

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
        select p.id, p.name, p.username, p.avatar_path, count(*)::int as going_count
        from public.event_attendees a
        join public.events e on e.id = a.event_id
        join public.profiles p on p.id = a.user_id
        where e.group_id = p_group_id and a.status = 'going'
        group by p.id, p.name, p.username, p.avatar_path
        order by going_count desc, p.name
        limit 5
      ) t
    ),
    'top_creators', (
      select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb)
      from (
        select p.id, p.name, p.username, p.avatar_path, count(*)::int as events_created
        from public.events e
        join public.profiles p on p.id = e.created_by
        where e.group_id = p_group_id
        group by p.id, p.name, p.username, p.avatar_path
        order by events_created desc, p.name
        limit 5
      ) t
    )
  ) into v_result;

  return v_result;
end;
$$;
