-- RPCs usadas pelo React (PostgREST)
-- Auth (login / create user / set password) fica nas Edge Functions — não em RPCs públicas.

-- Marca last_login_at (chamado após login bem-sucedido no client, ou pela Edge Function)
create or replace function public.touch_last_login()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Não autenticado';
  end if;

  update public.profiles
  set last_login_at = now()
  where id = auth.uid()
    and active = true;
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
