-- O21 updateNode (AC24.1, AC24.4, AC24.7): saves an edit if nobody saved since `p_version`,
-- marks AI cards as edited by a person, and marks every card built from it out of date.
-- Runs as the caller, so member access rules apply. History comes from the nodes trigger.
create or replace function public.update_node(p_node uuid, p_title text, p_body text, p_version int)
returns int
language plpgsql security invoker set search_path = '' as $$
declare
  me uuid := auth.uid();
  n public.nodes%rowtype;
  running boolean;
begin
  select * into n from public.nodes where id = p_node and deleted_at is null for update;
  if n.id is null then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  if n.type in ('objective', 'ethics', 'override') then
    raise exception 'not_editable' using errcode = '22023';
  end if;
  if char_length(coalesce(trim(p_title), '')) = 0 or char_length(p_title) > 200 or char_length(coalesce(p_body, '')) > 4000 then
    raise exception 'invalid' using errcode = '22023';
  end if;
  select exists (select 1 from public.stage_runs r where r.project_id = n.project_id and r.stage = n.stage
                 and r.status in ('queued', 'running')) into running;
  if running then
    raise exception 'locked' using errcode = 'P0004';
  end if;
  if n.version <> p_version then
    raise exception 'conflict' using errcode = 'P0003';
  end if;

  update public.nodes set
    title = trim(p_title),
    data = case when p_body is null then data else jsonb_set(data, '{body}', to_jsonb(p_body)) end,
    provenance = case when provenance = 'ai' then 'ai_edited' else provenance end,
    version = version + 1,
    updated_by = me
  where id = p_node;

  -- AC24.4: everything built from this card is out of date (it stays visible and usable).
  with recursive downstream(id) as (
    select e.to_id from public.edges e where e.from_id = p_node
    union
    select e.to_id from public.edges e join downstream d on e.from_id = d.id
  )
  update public.nodes set stale = true where id in (select id from downstream) and deleted_at is null;

  return n.version + 1;
end $$;

revoke all on function public.update_node(uuid, text, text, int) from public, anon;
grant execute on function public.update_node(uuid, text, text, int) to authenticated;
