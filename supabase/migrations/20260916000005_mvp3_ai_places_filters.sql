-- MVP 3: filtros inteligentes no sorteio + campos auxiliares em ideias

alter table public.outing_ideas
  add column if not exists period text
    check (period is null or period in ('morning', 'afternoon', 'night', 'any')),
  add column if not exists ambiance text;

comment on column public.outing_ideas.period is 'Horário preferencial: morning | afternoon | night | any';
comment on column public.outing_ideas.ambiance is 'Ambiente (ex.: interno, externo, calmo, animado)';

-- Sorteio com filtros opcionais e menor chance de repetir rolês recentes
create or replace function public.draw_outing_idea(
  p_group_id uuid,
  p_category text default null,
  p_max_cost numeric default null,
  p_period text default null,
  p_ambiance text default null,
  p_avoid_recent_days integer default 30
)
returns public.outing_ideas
language plpgsql
security definer
set search_path = public
as $$
declare
  v_idea public.outing_ideas%rowtype;
  v_avoid_days integer := greatest(coalesce(p_avoid_recent_days, 30), 0);
begin
  if not public.is_group_member(p_group_id) then
    raise exception 'Sem permissão neste grupo';
  end if;

  if p_period is not null
     and p_period not in ('morning', 'afternoon', 'night', 'any') then
    raise exception 'Período inválido';
  end if;

  -- Preferir ideias que não saíram recentemente; se o filtro esvaziar o pool, relaxar o histórico
  select * into v_idea
  from public.outing_ideas i
  where i.group_id = p_group_id
    and i.active = true
    and (p_category is null or lower(coalesce(i.category, '')) = lower(p_category))
    and (p_max_cost is null or i.estimated_cost is null or i.estimated_cost <= p_max_cost)
    and (
      p_period is null
      or p_period = 'any'
      or i.period is null
      or i.period = 'any'
      or i.period = p_period
    )
    and (
      p_ambiance is null
      or i.ambiance is null
      or lower(i.ambiance) like '%' || lower(p_ambiance) || '%'
    )
    and not exists (
      select 1
      from public.outing_history h
      where h.group_id = p_group_id
        and h.outing_idea_id = i.id
        and h.selected_at >= now() - make_interval(days => v_avoid_days)
    )
  order by random()
  limit 1;

  if not found then
    select * into v_idea
    from public.outing_ideas i
    where i.group_id = p_group_id
      and i.active = true
      and (p_category is null or lower(coalesce(i.category, '')) = lower(p_category))
      and (p_max_cost is null or i.estimated_cost is null or i.estimated_cost <= p_max_cost)
      and (
        p_period is null
        or p_period = 'any'
        or i.period is null
        or i.period = 'any'
        or i.period = p_period
      )
      and (
        p_ambiance is null
        or i.ambiance is null
        or lower(i.ambiance) like '%' || lower(p_ambiance) || '%'
      )
    order by random()
    limit 1;
  end if;

  if not found then
    raise exception 'Nenhuma ideia ativa para sortear com esses filtros';
  end if;

  insert into public.outing_history (group_id, outing_idea_id)
  values (p_group_id, v_idea.id);

  return v_idea;
end;
$$;

-- Mantém a assinatura antiga (só group_id) funcionando via overload implícito dos defaults
grant execute on function public.draw_outing_idea(uuid, text, numeric, text, text, integer) to authenticated;

-- Compat: chamadas antigas com um único argumento continuam válidas
drop function if exists public.draw_outing_idea(uuid);
create or replace function public.draw_outing_idea(p_group_id uuid)
returns public.outing_ideas
language sql
security definer
set search_path = public
as $$
  select * from public.draw_outing_idea(p_group_id, null, null, null, null, 30);
$$;

grant execute on function public.draw_outing_idea(uuid) to authenticated;
