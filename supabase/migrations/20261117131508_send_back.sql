-- O20 send back (AC25.2): records the decision with the feedback and re-runs the research
-- analysis with it. Sources already collected are kept. People's cards stay unless
-- `p_replace_human` is set.
create or replace function public.send_back_research(p_project uuid, p_feedback text, p_replace_human boolean)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  p public.projects%rowtype;
  last_run public.stage_runs%rowtype;
  steps jsonb;
  run uuid;
begin
  select * into p from public.projects where id = p_project for update;
  if p.id is null or not public.is_member(p.workspace_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if char_length(trim(coalesce(p_feedback, ''))) < 10 then
    raise exception 'feedback_short' using errcode = '22023';
  end if;
  if p.current_stage <> 'research' or p.status <> 'waiting' then
    raise exception 'not_waiting' using errcode = 'P0003';
  end if;
  select * into last_run from public.stage_runs r
    where r.project_id = p_project and r.stage = 'research' order by r.created_at desc limit 1;
  if last_run.id is null then
    raise exception 'no_research' using errcode = 'P0003';
  end if;
  insert into public.checkpoints (workspace_id, project_id, stage, decision, feedback, decided_by)
  values (p.workspace_id, p_project, 'research', 'send_back', trim(p_feedback), me);
  select jsonb_agg(
      case when s ->> 'key' in ('findings', 'synthesis') then jsonb_set(s, '{status}', '"waiting"') else s end
      order by ord)
    into steps
    from jsonb_array_elements(last_run.steps) with ordinality as e(s, ord);
  insert into public.stage_runs (workspace_id, project_id, stage, status, steps, feedback, replace_human, started_by, retry_of)
  values (p.workspace_id, p_project, 'research', 'queued', steps, trim(p_feedback), p_replace_human, me, last_run.id)
  returning id into run;
  update public.projects set status = 'running', updated_by = me where id = p_project;
  return run;
end $$;

revoke all on function public.send_back_research(uuid, text, boolean) from public, anon;
grant execute on function public.send_back_research(uuid, text, boolean) to authenticated;
