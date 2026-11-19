-- Slice 8: add, delete (with undo), merge, connect and disconnect cards (AC24.2, AC24.4–AC24.6,
-- AC24.8, AC30.x). Every function runs as the caller, so member access rules apply to each row.
-- Error codes: P0002 not found, P0003 conflict, P0004 locked (stage running), P0006 can't connect,
-- P0007 a link the card needs, P0008 objectives can't be deleted, 22023 invalid.

-- History can be told what kind of change is happening (merged, regenerated), by a transaction-local
-- setting only these functions use. Without it, history works as before.
create or replace function private.record_node_history() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  what text;
  forced text := nullif(current_setting('app.change', true), '');
begin
  if tg_op = 'INSERT' then
    what := 'created';
  elsif forced in ('edited', 'regenerated', 'merged') then
    what := forced;
  elsif new.deleted_at is not null and old.deleted_at is null then
    what := 'deleted';
  elsif new.deleted_at is null and old.deleted_at is not null then
    what := 'restored';
  elsif new.title is distinct from old.title or new.data is distinct from old.data then
    what := 'edited';
  else
    return new;
  end if;
  insert into public.node_history (workspace_id, node_id, snapshot, change, changed_by)
  values (new.workspace_id, new.id,
          jsonb_build_object('title', new.title, 'data', new.data, 'status', new.status, 'provenance', new.provenance),
          what, auth.uid());
  return new;
end $$;

-- AC24.4: every card built from the given cards is out of date. Returns how many.
create or replace function public.mark_downstream_stale(p_from uuid[]) returns int
language plpgsql security invoker set search_path = '' as $$
declare
  n int;
begin
  perform set_config('app.change', '', true);
  with recursive downstream(id) as (
    select e.to_id from public.edges e where e.from_id = any(p_from)
    union
    select e.to_id from public.edges e join downstream d on e.from_id = d.id
  )
  update public.nodes set stale = true
  where id in (select id from downstream) and id <> all(p_from) and deleted_at is null and stale = false;
  get diagnostics n = row_count;
  return n;
end $$;

-- True while a stage run is working on the cards of this stage.
create or replace function public.stage_is_running(p_project uuid, p_stage text) returns boolean
language sql stable security invoker set search_path = '' as $$
  select exists (select 1 from public.stage_runs r
                 where r.project_id = p_project and r.stage = p_stage and r.status in ('queued', 'running'));
$$;

-- AC24.2: a person adds a card of a type the research columns allow, with the links it needs.
create or replace function public.add_node(p_project uuid, p_type text, p_title text, p_body text, p_links uuid[])
returns uuid
language plpgsql security invoker set search_path = '' as $$
declare
  me uuid := auth.uid();
  ws uuid;
  need text;
  good int;
  new_id uuid;
begin
  select workspace_id into ws from public.projects where id = p_project;
  if ws is null then raise exception 'not_found' using errcode = 'P0002'; end if;
  need := case p_type when 'finding' then 'source' when 'theme' then 'finding'
                      when 'opportunity' then 'theme' when 'gap' then 'opportunity' end;
  if need is null then raise exception 'invalid_type' using errcode = '22023'; end if;
  if char_length(coalesce(trim(p_title), '')) = 0 or char_length(p_title) > 200
     or char_length(coalesce(p_body, '')) > 4000 then
    raise exception 'invalid' using errcode = '22023';
  end if;
  if public.stage_is_running(p_project, 'research') then
    raise exception 'locked' using errcode = 'P0004';
  end if;
  select count(*) into good from public.nodes
    where id = any(coalesce(p_links, '{}')) and project_id = p_project and type = need and deleted_at is null;
  if good = 0 or good <> cardinality(coalesce(p_links, '{}')) then
    raise exception 'link_required' using errcode = 'P0007';
  end if;
  insert into public.nodes (workspace_id, project_id, type, stage, title, data, provenance, sort_order, created_by, updated_by)
  values (ws, p_project, p_type, 'research', trim(p_title),
          case when p_body is null or p_body = '' then '{}'::jsonb else jsonb_build_object('body', p_body) end,
          'human',
          coalesce((select max(sort_order) + 1 from public.nodes
                    where project_id = p_project and type = p_type and deleted_at is null), 0),
          me, me)
  returning id into new_id;
  insert into public.edges (workspace_id, project_id, from_id, to_id)
  select ws, p_project, l, new_id from unnest(p_links) l;
  return new_id;
end $$;

-- AC24.5, AC24.8: delete a card (kept for 60 seconds so Undo works); what's built from it is out of date.
create or replace function public.delete_node(p_node uuid) returns int
language plpgsql security invoker set search_path = '' as $$
declare
  me uuid := auth.uid();
  n public.nodes%rowtype;
  deps int;
begin
  select * into n from public.nodes where id = p_node and deleted_at is null for update;
  if n.id is null then raise exception 'not_found' using errcode = 'P0002'; end if;
  if n.type = 'objective' then raise exception 'cant_delete_objective' using errcode = 'P0008'; end if;
  if n.type in ('ethics', 'override', 'source', 'asset_set') then
    raise exception 'not_deletable' using errcode = '22023';
  end if;
  if public.stage_is_running(n.project_id, n.stage) then
    raise exception 'locked' using errcode = 'P0004';
  end if;
  with recursive downstream(id) as (
    select e.to_id from public.edges e where e.from_id = p_node
    union
    select e.to_id from public.edges e join downstream d on e.from_id = d.id
  )
  select count(*) into deps from public.nodes where id in (select id from downstream) and deleted_at is null;
  perform set_config('app.change', '', true);
  update public.nodes set deleted_at = now(), updated_by = me where id = p_node;
  perform public.mark_downstream_stale(array[p_node]);
  return deps;
end $$;

-- AC24.5: Undo within 60 seconds of the delete.
create or replace function public.restore_node(p_node uuid) returns void
language plpgsql security invoker set search_path = '' as $$
declare
  me uuid := auth.uid();
  n public.nodes%rowtype;
begin
  select * into n from public.nodes where id = p_node for update;
  if n.id is null then raise exception 'not_found' using errcode = 'P0002'; end if;
  if n.deleted_at is null or n.deleted_at < now() - interval '60 seconds' then
    raise exception 'too_late' using errcode = 'P0003';
  end if;
  perform set_config('app.change', '', true);
  update public.nodes set deleted_at = null, updated_by = me where id = p_node;
end $$;

-- AC24.6: merge cards of one type into a new card with all their links; the originals are removed.
create or replace function public.merge_nodes(p_nodes uuid[], p_title text) returns uuid
language plpgsql security invoker set search_path = '' as $$
declare
  me uuid := auth.uid();
  ids uuid[] := (select array_agg(distinct x) from unnest(p_nodes) x);
  first_n public.nodes%rowtype;
  cnt int;
  kinds int;
  projects int;
  new_id uuid;
  merged jsonb;
  lowest text;
begin
  cnt := coalesce(cardinality(ids), 0);
  if cnt < 2 or cnt > 10 then raise exception 'invalid' using errcode = '22023'; end if;
  if char_length(coalesce(trim(p_title), '')) = 0 or char_length(p_title) > 200 then
    raise exception 'invalid' using errcode = '22023';
  end if;
  select count(*), count(distinct type), count(distinct project_id) into cnt, kinds, projects
    from public.nodes where id = any(ids) and deleted_at is null;
  if cnt <> cardinality(ids) then raise exception 'not_found' using errcode = 'P0002'; end if;
  if kinds <> 1 or projects <> 1 then raise exception 'invalid' using errcode = '22023'; end if;
  select * into first_n from public.nodes where id = any(ids) order by sort_order, created_at limit 1;
  if first_n.type not in ('finding', 'theme', 'opportunity', 'gap') then
    raise exception 'invalid_type' using errcode = '22023';
  end if;
  if public.stage_is_running(first_n.project_id, first_n.stage) then
    raise exception 'locked' using errcode = 'P0004';
  end if;

  merged := first_n.data
    || jsonb_build_object(
         'summary', coalesce((select string_agg(nullif(d ->> 'summary', ''), ' ' order by o) from
                               (select data as d, sort_order as o from public.nodes where id = any(ids)) s), ''),
         'mergedFrom', to_jsonb(ids))
    || case when first_n.type = 'finding' then jsonb_build_object(
         'sources', coalesce((select jsonb_agg(distinct s) from public.nodes n,
                               jsonb_array_elements_text(coalesce(n.data -> 'sources', '[]'::jsonb)) s
                               where n.id = any(ids)), '[]'::jsonb),
         'aiInference', false)
       else '{}'::jsonb end;
  select case when bool_or(confidence = 'Low') then 'Low' when bool_or(confidence = 'Med') then 'Med'
              when bool_or(confidence = 'High') then 'High' end into lowest
    from public.nodes where id = any(ids);

  insert into public.nodes (workspace_id, project_id, type, stage, title, data, provenance, confidence, sort_order, created_by, updated_by)
  values (first_n.workspace_id, first_n.project_id, first_n.type, first_n.stage, trim(p_title), merged,
          'human', lowest, first_n.sort_order, me, me)
  returning id into new_id;

  insert into public.edges (workspace_id, project_id, from_id, to_id)
  select first_n.workspace_id, first_n.project_id, f, new_id
    from (select distinct e.from_id f from public.edges e
           where e.to_id = any(ids) and e.from_id <> all(ids)) x
  union
  select first_n.workspace_id, first_n.project_id, new_id, t
    from (select distinct e.to_id t from public.edges e
           where e.from_id = any(ids) and e.to_id <> all(ids)) y;

  perform set_config('app.change', 'merged', true);
  update public.nodes set deleted_at = now(), updated_by = me where id = any(ids);
  perform set_config('app.change', '', true);
  perform public.mark_downstream_stale(array[new_id]);
  return new_id;
end $$;

-- Which card types a line may join (AC30.2): the next stage's card.
create or replace function public.can_connect(p_from text, p_to text) returns boolean
language sql immutable set search_path = '' as $$
  select (p_from, p_to) in (('objective', 'source'), ('source', 'finding'), ('finding', 'theme'),
                            ('theme', 'opportunity'), ('opportunity', 'gap'));
$$;

-- AC30.2, AC30.6: draw a line; the card it arrives at, and what's built from it, is out of date.
create or replace function public.connect_nodes(p_from uuid, p_to uuid) returns uuid
language plpgsql security invoker set search_path = '' as $$
declare
  me uuid := auth.uid();
  a public.nodes%rowtype;
  b public.nodes%rowtype;
  edge_id uuid;
begin
  select * into a from public.nodes where id = p_from and deleted_at is null;
  select * into b from public.nodes where id = p_to and deleted_at is null;
  if a.id is null or b.id is null then raise exception 'not_found' using errcode = 'P0002'; end if;
  if a.project_id <> b.project_id or not public.can_connect(a.type, b.type) then
    raise exception 'cant_connect' using errcode = 'P0006';
  end if;
  if exists (select 1 from public.edges where from_id = p_from and to_id = p_to) then
    raise exception 'already' using errcode = 'P0003';
  end if;
  if public.stage_is_running(b.project_id, b.stage) then
    raise exception 'locked' using errcode = 'P0004';
  end if;
  insert into public.edges (workspace_id, project_id, from_id, to_id)
  values (a.workspace_id, a.project_id, p_from, p_to) returning id into edge_id;
  perform set_config('app.change', 'edited', true);
  update public.nodes set updated_by = me where id in (p_from, p_to);
  perform set_config('app.change', '', true);
  update public.nodes set stale = true where id = p_to;
  perform public.mark_downstream_stale(array[p_to]);
  return edge_id;
end $$;

-- AC30.4, AC30.5: remove a line, unless the card needs it.
create or replace function public.disconnect_edge(p_edge uuid) returns void
language plpgsql security invoker set search_path = '' as $$
declare
  me uuid := auth.uid();
  e public.edges%rowtype;
  b public.nodes%rowtype;
  others int;
begin
  select * into e from public.edges where id = p_edge;
  if e.id is null then raise exception 'not_found' using errcode = 'P0002'; end if;
  select * into b from public.nodes where id = e.to_id;
  if public.stage_is_running(b.project_id, b.stage) then
    raise exception 'locked' using errcode = 'P0004';
  end if;
  if b.type in ('theme', 'opportunity', 'gap') then
    select count(*) into others from public.edges x
      join public.nodes f on f.id = x.from_id and f.deleted_at is null
      where x.to_id = e.to_id and x.id <> p_edge;
    if others = 0 then raise exception 'link_required' using errcode = 'P0007'; end if;
  end if;
  delete from public.edges where id = p_edge;
  perform set_config('app.change', 'edited', true);
  update public.nodes set updated_by = me where id in (e.from_id, e.to_id);
  perform set_config('app.change', '', true);
  update public.nodes set stale = true where id = e.to_id;
  perform public.mark_downstream_stale(array[e.to_id]);
end $$;

revoke all on function public.mark_downstream_stale(uuid[]), public.stage_is_running(uuid, text),
  public.add_node(uuid, text, text, text, uuid[]), public.delete_node(uuid), public.restore_node(uuid),
  public.merge_nodes(uuid[], text), public.can_connect(text, text), public.connect_nodes(uuid, uuid),
  public.disconnect_edge(uuid) from public, anon;
grant execute on function public.mark_downstream_stale(uuid[]), public.stage_is_running(uuid, text),
  public.add_node(uuid, text, text, text, uuid[]), public.delete_node(uuid), public.restore_node(uuid),
  public.merge_nodes(uuid[], text), public.can_connect(text, text), public.connect_nodes(uuid, uuid),
  public.disconnect_edge(uuid) to authenticated;
