-- Phase 1: add and remove emails (AC31.2, AC31.9). Run as the caller, so member access rules apply.
-- Error codes: P0002 not found, P0009 too many emails, 22023 invalid.

-- Marks what the emails feed as out of date: the report summary and themes (AC31.9).
create or replace function public.mark_email_outputs_stale(p_project uuid) returns void
language sql security invoker set search_path = '' as $$
  update public.nodes set stale = true
  where project_id = p_project and type in ('theme', 'opportunity', 'gap') and deleted_at is null;
$$;

create or replace function public.add_email(
  p_project uuid, p_source text, p_subject text, p_html text, p_parts jsonb, p_upload uuid
) returns uuid
language plpgsql security invoker set search_path = '' as $$
declare
  me uuid := auth.uid();
  ws uuid;
  v_email uuid;
  v_node uuid;
begin
  select workspace_id into ws from public.projects where id = p_project;
  if ws is null then raise exception 'not_found' using errcode = 'P0002'; end if;
  if p_source not in ('paste', 'html', 'eml')
     or char_length(coalesce(trim(p_subject), '')) not between 1 and 300
     or char_length(coalesce(p_html, '')) not between 1 and 1000000 then
    raise exception 'invalid' using errcode = '22023';
  end if;
  if (select count(*) from public.emails where project_id = p_project) >= 20 then
    raise exception 'too_many' using errcode = 'P0009';
  end if;

  v_email := gen_random_uuid();
  insert into public.nodes (workspace_id, project_id, type, stage, title, data, provenance, sort_order, created_by, updated_by)
  values (ws, p_project, 'email', 'intake', trim(p_subject),
          jsonb_build_object(
            'emailId', v_email,
            'source', p_source,
            'buttons', coalesce(jsonb_array_length(p_parts -> 'ctas'), 0),
            'hasPreheader', (p_parts ->> 'preheader') is not null,
            'words', coalesce((p_parts ->> 'wordCount')::int, 0)),
          'human',
          coalesce((select max(sort_order) + 1 from public.nodes
                    where project_id = p_project and type = 'email' and deleted_at is null), 0),
          me, me)
  returning id into v_node;
  insert into public.emails (id, workspace_id, project_id, node_id, upload_id, source, subject, preheader, html, parts, added_by)
  values (v_email, ws, p_project, v_node, p_upload, p_source, trim(p_subject), p_parts ->> 'preheader', p_html, p_parts, me);
  perform public.mark_email_outputs_stale(p_project);
  return v_email;
end $$;

create or replace function public.remove_email(p_email uuid) returns void
language plpgsql security invoker set search_path = '' as $$
declare
  me uuid := auth.uid();
  e public.emails%rowtype;
begin
  select * into e from public.emails where id = p_email;
  if e.id is null then raise exception 'not_found' using errcode = 'P0002'; end if;
  if e.node_id is not null then
    update public.nodes set deleted_at = now(), updated_by = me where id = e.node_id and deleted_at is null;
  end if;
  delete from public.emails where id = p_email;
  perform public.mark_email_outputs_stale(e.project_id);
end $$;

-- Emails are removed with remove_email, which also removes the row the brief lists.
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
  if n.type in ('ethics', 'override', 'source', 'asset_set', 'email') then
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

revoke all on function public.mark_email_outputs_stale(uuid), public.add_email(uuid, text, text, text, jsonb, uuid),
  public.remove_email(uuid) from public, anon;
grant execute on function public.mark_email_outputs_stale(uuid), public.add_email(uuid, text, text, text, jsonb, uuid),
  public.remove_email(uuid) to authenticated;
