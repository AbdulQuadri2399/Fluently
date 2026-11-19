-- O26 getTrace (AC23.1, AC23.2): every card upstream of a card (through its saved lines), up to
-- the objectives, plus the card itself. Runs as the caller, so access rules apply to every row.
-- Plain UNION on the id alone: each card is visited once, so loops can't run away.
create or replace function public.trace_path(p_node uuid) returns setof uuid
language sql stable security invoker set search_path = '' as $$
  with recursive up(id) as (
    select n.id from public.nodes n where n.id = p_node and n.deleted_at is null
    union
    select e.from_id
    from up
    join public.edges e on e.to_id = up.id
    join public.nodes f on f.id = e.from_id and f.deleted_at is null
  )
  select id from up;
$$;

revoke all on function public.trace_path(uuid) from public, anon;
grant execute on function public.trace_path(uuid) to authenticated;
