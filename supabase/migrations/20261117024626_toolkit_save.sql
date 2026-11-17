-- O9 saveToolkitVersion (AC4.5, AC4.8): one call saves the version, its principles and their
-- connections, and makes it the workspace default — all or nothing. Runs as the caller, so the
-- admin-only insert policies still apply. Versions are numbered per workspace (1, 2, 3…).

create trigger toolkit_versions_updated_at before update on public.toolkit_versions
  for each row execute function public.set_updated_at();
create trigger principles_updated_at before update on public.principles
  for each row execute function public.set_updated_at();
create trigger principle_relations_updated_at before update on public.principle_relations
  for each row execute function public.set_updated_at();
create trigger toolkit_candidates_updated_at before update on public.toolkit_candidates
  for each row execute function public.set_updated_at();

create or replace function public.save_toolkit_version(
  p_file_name text,
  p_principles jsonb,
  p_relations jsonb,
  p_warnings jsonb
) returns table (version_id uuid, version_number int)
language plpgsql security invoker set search_path = '' as $$
declare
  ws uuid;
  next_number int;
  v uuid;
begin
  select m.workspace_id into ws from public.members m where m.id = auth.uid() and m.active;
  if ws is null or not public.is_admin(ws) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  -- Serialise uploads in one workspace so version numbers never clash.
  perform 1 from public.workspaces w where w.id = ws for update;
  select coalesce(max(t.number), 0) + 1 into next_number
    from public.toolkit_versions t where t.workspace_id = ws;

  insert into public.toolkit_versions (workspace_id, number, file_name, uploaded_by, principle_count, warnings)
  values (ws, next_number, p_file_name, auth.uid(), jsonb_array_length(p_principles), coalesce(p_warnings, '[]'::jsonb))
  returning id into v;

  insert into public.principles (
    workspace_id, version_id, principle_key, name, general_goal, sub_goal, mechanism, sense,
    quick_insight, extended_explanation, examples, link_to_paper, reference, design_lever,
    outcome, evidence, related_raw, evidence_level)
  select ws, v, p.principle_key, p.name, p.general_goal, p.sub_goal, p.mechanism, p.sense,
    p.quick_insight, p.extended_explanation, p.examples, p.link_to_paper, p.reference, p.design_lever,
    p.outcome, p.evidence, p.related_raw, p.evidence_level
  from jsonb_to_recordset(p_principles) as p(
    principle_key text, name text, general_goal text, sub_goal text, mechanism text, sense text,
    quick_insight text, extended_explanation text, examples text, link_to_paper text, reference text,
    design_lever text, outcome text, evidence text, related_raw text, evidence_level text);

  insert into public.principle_relations (workspace_id, version_id, from_id, to_id)
  select distinct ws, v, f.id, t.id
  from jsonb_to_recordset(coalesce(p_relations, '[]'::jsonb)) as r("from" text, "to" text)
  join public.principles f on f.version_id = v and f.principle_key = r."from"
  join public.principles t on t.version_id = v and t.principle_key = r."to"
  where f.id <> t.id;

  update public.workspaces set default_toolkit_version_id = v where id = ws;
  return query select v, next_number;
end $$;

revoke all on function public.save_toolkit_version(text, jsonb, jsonb, jsonb) from public, anon;
grant execute on function public.save_toolkit_version(text, jsonb, jsonb, jsonb) to authenticated;
