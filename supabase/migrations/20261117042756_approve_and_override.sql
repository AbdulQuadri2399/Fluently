-- O15 approveObjectives (AC9.2) and O17 recordOverride (AC26.1, AC26.2) as single transactions.
-- Field checks (missing objectives, sector, assets, refused sector) happen in the Server Action
-- first; these functions re-check membership and that the objectives are filled.

create or replace function public.approve_objectives(p_project uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  p public.projects%rowtype;
  i public.intakes%rowtype;
  run uuid;
  flags jsonb;
begin
  select * into p from public.projects where id = p_project;
  if p.id is null or not public.is_member(p.workspace_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select * into i from public.intakes where project_id = p_project for update;
  if coalesce(trim(i.business_objective), '') = '' or coalesce(trim(i.behavioural_objective), '') = '' then
    raise exception 'missing_objectives' using errcode = '22023';
  end if;
  if exists (select 1 from public.stage_runs r where r.project_id = p_project and r.stage = 'ethics'
             and r.status in ('queued', 'running')) then
    raise exception 'already_running' using errcode = 'P0004';
  end if;
  flags := coalesce(i.low_specificity, '{}'::jsonb);

  update public.intakes set approved_at = now(), approved_by = me where project_id = p_project;

  -- One card per objective; re-approving after an edit updates them in place.
  insert into public.nodes (workspace_id, project_id, type, stage, title, data, provenance, low_specificity, sort_order, created_by, updated_by)
  select p.workspace_id, p_project, 'objective', 'intake', v.title, jsonb_build_object('kind', v.kind, 'text', v.body),
         'human', coalesce((flags ->> v.field)::boolean, false), v.ord, me, me
  from (values
    ('business', 'business_objective', 'Business objective', i.business_objective, 0),
    ('behavioural', 'behavioural_objective', 'Behavioural objective', i.behavioural_objective, 1)
  ) as v(kind, field, title, body, ord)
  where not exists (
    select 1 from public.nodes n where n.project_id = p_project and n.type = 'objective'
      and n.data ->> 'kind' = v.kind and n.deleted_at is null);

  update public.nodes n set
    data = jsonb_build_object('kind', n.data ->> 'kind', 'text',
             case n.data ->> 'kind' when 'business' then i.business_objective else i.behavioural_objective end),
    low_specificity = coalesce((flags ->> (case n.data ->> 'kind' when 'business' then 'business_objective' else 'behavioural_objective' end))::boolean, false),
    stale = false, updated_by = me
  where n.project_id = p_project and n.type = 'objective' and n.deleted_at is null;

  insert into public.checkpoints (workspace_id, project_id, stage, decision, decided_by)
  values (p.workspace_id, p_project, 'intake', 'approve', me);

  insert into public.stage_runs (workspace_id, project_id, stage, status, started_by)
  values (p.workspace_id, p_project, 'ethics', 'queued', me)
  returning id into run;

  update public.projects set current_stage = 'ethics', status = 'running', updated_by = me where id = p_project;
  return run;
end $$;

revoke all on function public.approve_objectives(uuid) from public, anon;
grant execute on function public.approve_objectives(uuid) to authenticated;

-- Runs as the caller, so the member insert policies (recorded as yourself) still apply.
create or replace function public.record_override(p_node uuid, p_reason text) returns uuid
language plpgsql security invoker set search_path = '' as $$
declare
  me uuid := auth.uid();
  n public.nodes%rowtype;
  rules text;
  override_id uuid;
begin
  if char_length(coalesce(p_reason, '')) < 20 then
    raise exception 'reason_too_short' using errcode = '22023';
  end if;
  select * into n from public.nodes where id = p_node and deleted_at is null for update;
  if n.id is null then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  if n.status <> 'flagged' then
    raise exception 'not_flagged' using errcode = 'P0003';
  end if;
  select string_agg(r ->> 'rule', ', ') into rules from jsonb_array_elements(coalesce(n.data -> 'reasons', '[]'::jsonb)) r;

  insert into public.ethics_overrides (workspace_id, project_id, node_id, rule, reason, decided_by)
  values (n.workspace_id, n.project_id, n.id, coalesce(rules, 'Ethics flag'), p_reason, me);

  insert into public.nodes (workspace_id, project_id, type, stage, title, data, provenance, created_by, updated_by)
  values (n.workspace_id, n.project_id, 'override', n.stage, 'Override',
          jsonb_build_object('rule', coalesce(rules, 'Ethics flag'), 'reason', p_reason, 'level', 'gate', 'decided_by', me),
          'human', me, me)
  returning id into override_id;

  insert into public.edges (workspace_id, project_id, from_id, to_id) values (n.workspace_id, n.project_id, n.id, override_id);
  update public.nodes set status = 'overridden', updated_by = me where id = n.id;
  if n.type = 'ethics' then
    update public.projects set current_stage = 'research', status = 'waiting', updated_by = me where id = n.project_id;
  end if;
  return override_id;
end $$;

revoke all on function public.record_override(uuid, text) from public, anon;
grant execute on function public.record_override(uuid, text) to authenticated;
