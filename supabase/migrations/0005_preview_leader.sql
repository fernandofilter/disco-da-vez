-- A lista "Seus grupos" mostra "Excluir" só nos grupos em que você é o líder.
-- Rode no SQL Editor do Supabase (ou `supabase db push`) depois das migrações anteriores.
drop function if exists group_preview(uuid);
create function group_preview(gid uuid)
returns table (name text, member_count int, leader_name text, is_leader boolean)
language sql security definer stable set search_path = public as $$
  select g.name,
         (select count(*)::int from members where group_id = g.id),
         (select m.name from members m where m.group_id = g.id and m.user_id = g.leader_id),
         g.leader_id = auth.uid()
  from groups g where g.id = gid
$$;

revoke execute on function group_preview from public, anon;
grant execute on function group_preview to authenticated;

notify pgrst, 'reload schema';
