-- RPCs usadas pelo React (PostgREST)

-- Resolve username → email para login (só se ativo)
create or replace function public.resolve_login_email(p_username text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
begin
  select email into v_email
  from public.profiles
  where lower(username) = lower(trim(p_username))
    and active = true;

  return v_email;
end;
$$;

grant execute on function public.resolve_login_email(text) to anon, authenticated;

-- Valida convite (página de signup, anon)
create or replace function public.get_invite_by_token(p_token text)
returns table (
  id uuid,
  email text,
  username text,
  name text,
  role text,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select i.id, i.email, i.username, i.name, i.role, i.expires_at
  from public.invites i
  where i.token = p_token
    and i.used_at is null
    and i.expires_at > now();
end;
$$;

grant execute on function public.get_invite_by_token(text) to anon, authenticated;

-- Após signup: cria profile + membership a partir do convite
create or replace function public.complete_invite_signup(p_token text)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite public.invites%rowtype;
  v_profile public.profiles%rowtype;
  v_group_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Não autenticado';
  end if;

  select * into v_invite
  from public.invites
  where token = p_token
    and used_at is null
    and expires_at > now()
  for update;

  if not found then
    raise exception 'Convite inválido ou expirado';
  end if;

  if lower(v_invite.email) <> lower(coalesce(auth.jwt() ->> 'email', '')) then
    raise exception 'E-mail do convite não corresponde ao usuário autenticado';
  end if;

  insert into public.profiles (id, name, username, email, role, active)
  values (
    auth.uid(),
    v_invite.name,
    v_invite.username,
    v_invite.email,
    v_invite.role,
    true
  )
  on conflict (id) do update
    set name = excluded.name,
        username = excluded.username,
        email = excluded.email,
        role = excluded.role,
        active = true
  returning * into v_profile;

  select id into v_group_id from public.groups order by created_at limit 1;

  if v_group_id is not null then
    insert into public.group_members (group_id, user_id, role, active)
    values (v_group_id, auth.uid(), 'member', true)
    on conflict (group_id, user_id) do update set active = true;
  end if;

  update public.invites set used_at = now() where id = v_invite.id;

  return v_profile;
end;
$$;

grant execute on function public.complete_invite_signup(text) to authenticated;

-- Marca last_login_at
create or replace function public.touch_last_login()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set last_login_at = now()
  where id = auth.uid();
end;
$$;

grant execute on function public.touch_last_login() to authenticated;

-- Sorteio de ideia ativa
create or replace function public.draw_outing_idea(p_group_id uuid)
returns public.outing_ideas
language plpgsql
security definer
set search_path = public
as $$
declare
  v_idea public.outing_ideas%rowtype;
begin
  if not public.is_group_member(p_group_id) then
    raise exception 'Sem permissão neste grupo';
  end if;

  select * into v_idea
  from public.outing_ideas
  where group_id = p_group_id and active = true
  order by random()
  limit 1;

  if not found then
    raise exception 'Nenhuma ideia ativa para sortear';
  end if;

  insert into public.outing_history (group_id, outing_idea_id)
  values (p_group_id, v_idea.id);

  return v_idea;
end;
$$;

grant execute on function public.draw_outing_idea(uuid) to authenticated;

-- Auto-profile opcional se admin criar usuário pelo Dashboard sem convite:
-- (não cria automaticamente; bootstrap via seed.sql)
