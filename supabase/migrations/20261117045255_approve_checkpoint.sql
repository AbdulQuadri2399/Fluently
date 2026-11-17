-- O20 decideCheckpoint, approve path (AC25.1, AC25.3): records the decision and moves the
-- project on. Send-back arrives with Slice 6.
create or replace function public.approve_checkpoint(p_project uuid, p_stage text, p_selection uuid[] default null)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  p public.projects%rowtype;
  next_stage text;
  cp uuid;
begin
  select * into p from public.projects where id = p_project for update;
  if p.id is null or not public.is_member(p.workspace_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p.current_stage <> p_stage or p.status <> 'waiting' then
    raise exception 'not_waiting' using errcode = 'P0003';
  end if;
  next_stage := case p_stage
    when 'research' then 'solutions' when 'solutions' then 'lofi' when 'lofi' then 'testplan'
    when 'testplan' then 'complete' else null end;
  if next_stage is null then
    raise exception 'unknown_stage' using errcode = '22023';
  end if;
  insert into public.checkpoints (workspace_id, project_id, stage, decision, selection, decided_by)
  values (p.workspace_id, p_project, p_stage, 'approve', p_selection, me) returning id into cp;
  update public.projects
    set current_stage = next_stage, status = case when next_stage = 'complete' then 'complete' else 'in_progress' end, updated_by = me
    where id = p_project;
  return cp;
end $$;

revoke all on function public.approve_checkpoint(uuid, text, uuid[]) from public, anon;
grant execute on function public.approve_checkpoint(uuid, text, uuid[]) to authenticated;
