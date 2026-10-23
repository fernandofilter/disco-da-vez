-- Quem entra com a rodada em andamento não precisa esperar ela acabar:
-- 1) com a rodada ainda nas escolhas, quem entra no grupo já vira participante;
-- 2) "Voltar às escolhas" refaz a lista de participantes com quem está no grupo agora (recém-chegados entram,
--    quem saiu fica de fora) e passa a valer também com a votação aberta, apagando os votos já dados.
-- As escolhas e o "pronto" de quem já estava continuam como estavam.
-- Rode no SQL Editor do Supabase (ou `supabase db push`) depois das migrações anteriores. Pode rodar de novo sem erro.

create or replace function join_group(gid uuid, p_name text, p_lastfm text default null) returns uuid
language plpgsql security definer set search_path = public as $$
declare mid uuid;
begin
  perform _uid();
  if not exists (select 1 from groups where id = gid) then raise exception 'group_not_found'; end if;
  select id into mid from members where group_id = gid and user_id = auth.uid();
  if mid is not null then
    update members set name = trim(p_name), lastfm_user = nullif(trim(p_lastfm), ''), last_seen = now() where id = mid;
    return mid;
  end if;
  if (select count(*) from members where group_id = gid) >= 6 then raise exception 'group_full'; end if;
  insert into members (group_id, user_id, name, lastfm_user)
  values (gid, auth.uid(), trim(p_name), nullif(trim(p_lastfm), ''))
  returning id into mid;
  -- a rodada ainda está nas escolhas: entra nela
  with r as (
    update rounds set participants = participants || mid
    where group_id = gid and status = 'choosing'
    returning id
  )
  insert into round_choices (round_id, member_id, group_id)
  select r.id, mid, gid from r;
  return mid;
end $$;

create or replace function back_to_choosing(rid uuid) returns void
language plpgsql security definer set search_path = public as $$
declare r rounds; ids uuid[];
begin
  r := _leader_round(rid);
  if r.status not in ('drawing', 'voting') then raise exception 'round_locked'; end if;
  select array_agg(id) into ids from members where group_id = r.group_id;
  update rounds
  set status = 'choosing', participants = ids, result = null, candidates = null, result_at = null
  where id = rid;
  insert into round_choices (round_id, member_id, group_id)
  select rid, m.id, r.group_id from members m where m.group_id = r.group_id
  on conflict (round_id, member_id) do nothing;
  delete from votes where round_id = rid;
  update round_choices set voted = false where round_id = rid;
end $$;

notify pgrst, 'reload schema';
