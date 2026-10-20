-- Cada rodada nova começa com as escolhas zeradas (antes herdava as últimas escolhas de cada pessoa).
-- Rode no SQL Editor do Supabase (ou `supabase db push`) depois das migrações anteriores.
create or replace function start_round(gid uuid, p_mode text, p_kind text) returns uuid
language plpgsql security definer set search_path = public as $$
declare rid uuid; ids uuid[];
begin
  if not exists (select 1 from groups where id = gid and leader_id = _uid()) then raise exception 'forbidden'; end if;
  select array_agg(id) into ids from members where group_id = gid;
  if coalesce(array_length(ids, 1), 0) < 2 then raise exception 'need_two_members'; end if;
  delete from rounds where group_id = gid and status <> 'done';
  insert into rounds (group_id, mode, kind, participants) values (gid, p_mode, p_kind, ids) returning id into rid;
  insert into round_choices (round_id, member_id, group_id, items)
  select rid, m.id, gid, '[]'::jsonb from members m where m.group_id = gid;
  update groups set last_mode = p_mode, last_kind = p_kind where id = gid;
  return rid;
end $$;
