-- O36 Current assets cards (AC22.11): split, move. Every asset stays in exactly one card, and a
-- card left empty is removed. Runs as the caller, so member access rules apply.

create or replace function public.move_assets(p_project uuid, p_uploads uuid[], p_to uuid)
returns uuid
language plpgsql security invoker set search_path = '' as $$
declare
  me uuid := auth.uid();
  target public.nodes%rowtype;
  ws uuid;
begin
  select workspace_id into ws from public.projects where id = p_project;
  if ws is null or not public.is_member(ws) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if exists (select 1 from unnest(p_uploads) u where not exists (
      select 1 from public.uploads x where x.id = u and x.project_id = p_project and x.kind = 'asset')) then
    raise exception 'invalid' using errcode = '22023';
  end if;

  if p_to is null then
    -- Split: a new card for the chosen assets.
    insert into public.nodes (workspace_id, project_id, type, stage, title, data, provenance, created_by, updated_by, sort_order)
    values (ws, p_project, 'asset_set', 'intake', 'Current assets', '{}'::jsonb, 'human', me, me,
            (select coalesce(max(sort_order), 0) + 1 from public.nodes where project_id = p_project and type = 'asset_set'))
    returning * into target;
  else
    select * into target from public.nodes where id = p_to and project_id = p_project and type = 'asset_set' and deleted_at is null for update;
    if target.id is null then
      raise exception 'not_found' using errcode = 'P0002';
    end if;
  end if;

  -- Take the assets out of every other card.
  update public.nodes n set
    data = jsonb_set(n.data, '{uploadIds}', coalesce((
      select jsonb_agg(v) from jsonb_array_elements(coalesce(n.data -> 'uploadIds', '[]'::jsonb)) v
      where (v #>> '{}')::uuid <> all (p_uploads)), '[]'::jsonb)),
    updated_by = me
  where n.project_id = p_project and n.type = 'asset_set' and n.deleted_at is null and n.id <> target.id;

  -- Put them in the target card (no duplicates).
  update public.nodes n set
    data = jsonb_set(n.data, '{uploadIds}', (
      select coalesce(jsonb_agg(distinct v), '[]'::jsonb) from (
        select v from jsonb_array_elements(coalesce(n.data -> 'uploadIds', '[]'::jsonb)) v
        union select to_jsonb(u::text) from unnest(p_uploads) u) x)),
    updated_by = me
  where n.id = target.id;

  update public.nodes n set data = jsonb_set(n.data, '{count}', to_jsonb(jsonb_array_length(n.data -> 'uploadIds')))
  where n.project_id = p_project and n.type = 'asset_set' and n.deleted_at is null;

  -- A card left empty is removed (soft delete keeps history).
  update public.nodes set deleted_at = now(), updated_by = me
  where project_id = p_project and type = 'asset_set' and deleted_at is null
    and jsonb_array_length(coalesce(data -> 'uploadIds', '[]'::jsonb)) = 0;

  return target.id;
end $$;

revoke all on function public.move_assets(uuid, uuid[], uuid) from public, anon;
grant execute on function public.move_assets(uuid, uuid[], uuid) to authenticated;
