-- Excluir grupo/histórico e animação imediata (o líder "abre" o sorteio/votação antes de buscar os álbuns).
-- Rode no SQL Editor do Supabase (ou `supabase db push`) depois das migrações 0001 e 0002.

-- ---------------------------------------------------------------- animação imediata

-- 1) o líder clica: a rodada entra em 'drawing' (sorteio) ou 'voting' (votação) ainda sem resultado, e todos veem a dinâmica começar;
-- 2) publish_draw / publish_vote preenchem o resultado quando a busca termina. Também serve para "sortear de novo".
create function begin_deal(rid uuid) returns void
language plpgsql security definer set search_path = public as $$
declare r rounds;
begin
  r := _leader_round(rid);
  if r.status = 'choosing' then
    if not _all_ready(r) then raise exception 'not_ready'; end if;
  elsif not (r.kind = 'draw' and r.status = 'drawing') then
    raise exception 'round_locked';
  end if;
  update rounds
  set status = case r.kind when 'vote' then 'voting' else 'drawing' end,
      result = null, candidates = null, result_at = null, spin = spin + 1
  where id = rid;
  update round_choices set voted = false where round_id = rid;
end $$;

create or replace function publish_draw(rid uuid, p_result jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare r rounds;
begin
  r := _leader_round(rid);
  if r.kind <> 'draw' or r.status <> 'drawing' then raise exception 'round_locked'; end if;
  update rounds set result = p_result, result_at = now() where id = rid;
end $$;

-- p_filler: capas só para a animação de revelação (fica em result até a votação fechar)
drop function publish_vote(uuid, jsonb);
create function publish_vote(rid uuid, p_candidates jsonb, p_filler jsonb default '[]') returns void
language plpgsql security definer set search_path = public as $$
declare r rounds;
begin
  r := _leader_round(rid);
  if r.kind <> 'vote' or r.status <> 'voting' or r.candidates is not null then raise exception 'round_locked'; end if;
  if jsonb_typeof(p_candidates) <> 'array' or jsonb_array_length(p_candidates) not between 2 and 6 then
    raise exception 'invalid_candidates';
  end if;
  update rounds set candidates = p_candidates, result = jsonb_build_object('filler', p_filler), result_at = now() where id = rid;
end $$;

-- desistir (busca falhou ou o líder recarregou a página no meio)
create or replace function back_to_choosing(rid uuid) returns void
language plpgsql security definer set search_path = public as $$
declare r rounds;
begin
  r := _leader_round(rid);
  if not (r.status = 'drawing' or (r.status = 'voting' and r.candidates is null)) then raise exception 'round_locked'; end if;
  update rounds set status = 'choosing', result = null, candidates = null, result_at = null where id = rid;
end $$;

create or replace function close_vote(rid uuid) returns void
language plpgsql security definer set search_path = public as $$
declare r rounds; all_voted boolean; tied jsonb; winner jsonb; tally jsonb;
begin
  select * into r from rounds where id = rid for update;
  if r.id is null or r.status <> 'voting' or r.candidates is null then raise exception 'round_locked'; end if;
  select coalesce(bool_and(coalesce(rc.voted, false)), false) into all_voted
  from members m left join round_choices rc on rc.round_id = rid and rc.member_id = m.id
  where m.id = any (r.participants);
  if not all_voted and not exists (select 1 from groups where id = r.group_id and leader_id = _uid()) then
    raise exception 'forbidden';
  end if;

  with t as (
    select c as album, (select count(*) from votes v where v.round_id = rid and v.album_id = c ->> 'id') as n
    from jsonb_array_elements(r.candidates) c
  ), top as (select max(n) as m from t)
  select (select jsonb_agg(album) from t, top where t.n = top.m),
         (select album from t, top where t.n = top.m order by random() limit 1),
         (select jsonb_object_agg(album ->> 'id', n) from t)
  into tied, winner, tally;

  insert into history (group_id, album_id, album, round_id)
  values (r.group_id, winner ->> 'id', winner, rid)
  on conflict (group_id, album_id) do nothing;

  update rounds
  set status = 'done', spin = 1, result_at = now(),
      result = jsonb_build_object('album', winner, 'tied', tied, 'tally', tally)
  where id = rid;
end $$;

-- ---------------------------------------------------------------- excluir (só o líder)

create function delete_group(gid uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from groups where id = gid and leader_id = _uid()) then raise exception 'forbidden'; end if;
  delete from groups where id = gid; -- membros, rodadas, votos e histórico saem em cascata
end $$;

create function delete_history_item(hid uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  delete from history h using groups g
  where h.id = hid and g.id = h.group_id and g.leader_id = _uid();
  if not found then raise exception 'forbidden'; end if;
end $$;

revoke execute on function begin_deal, publish_vote, delete_group, delete_history_item from public, anon;
grant execute on function begin_deal, publish_vote, delete_group, delete_history_item to authenticated;
