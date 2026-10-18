-- Album Sort: grupos, rodadas, votos e histórico.
-- Leitura via RLS (só membros do grupo); toda escrita passa por funções RPC (security definer).
-- Requer "Anonymous sign-ins" habilitado em Authentication > Providers.

create table groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 40),
  leader_id uuid not null,
  last_mode text not null default 'artist' check (last_mode in ('artist', 'genre')),
  last_kind text not null default 'draw' check (last_kind in ('draw', 'vote')),
  created_at timestamptz not null default now()
);

create table members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups on delete cascade,
  user_id uuid not null,
  name text not null check (char_length(name) between 1 and 24),
  lastfm_user text check (lastfm_user is null or char_length(lastfm_user) between 1 and 40),
  last_choices jsonb not null default '{}',
  last_seen timestamptz not null default now(),
  joined_at timestamptz not null default now(),
  unique (group_id, user_id)
);

create table rounds (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups on delete cascade,
  mode text not null check (mode in ('artist', 'genre')),
  kind text not null check (kind in ('draw', 'vote')),
  status text not null default 'choosing' check (status in ('choosing', 'drawing', 'voting', 'done')),
  participants uuid[] not null,
  candidates jsonb,
  result jsonb,
  spin int not null default 0,
  result_at timestamptz,
  created_at timestamptz not null default now()
);

create table round_choices (
  round_id uuid not null references rounds on delete cascade,
  member_id uuid not null references members on delete cascade,
  group_id uuid not null references groups on delete cascade,
  items jsonb not null default '[]',
  ready boolean not null default false,
  voted boolean not null default false,
  primary key (round_id, member_id)
);

create table votes (
  round_id uuid not null references rounds on delete cascade,
  member_id uuid not null references members on delete cascade,
  group_id uuid not null references groups on delete cascade,
  user_id uuid not null,
  album_id text not null,
  primary key (round_id, member_id)
);

create table history (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups on delete cascade,
  album_id text not null,
  album jsonb not null,
  round_id uuid references rounds on delete set null,
  confirmed_at timestamptz not null default now(),
  unique (group_id, album_id)
);

create index on members (group_id);
create index on rounds (group_id, created_at desc);
create index on round_choices (group_id);
create index on history (group_id, confirmed_at desc);

-- ---------------------------------------------------------------- RLS (somente leitura)

create function is_member(gid uuid) returns boolean
language sql security definer stable set search_path = public as $$
  select exists (select 1 from members where group_id = gid and user_id = auth.uid())
$$;

alter table groups enable row level security;
alter table members enable row level security;
alter table rounds enable row level security;
alter table round_choices enable row level security;
alter table votes enable row level security;
alter table history enable row level security;

create policy groups_read on groups for select using (is_member(id));
create policy members_read on members for select using (is_member(group_id));
create policy rounds_read on rounds for select using (is_member(group_id));
create policy choices_read on round_choices for select using (is_member(group_id));
create policy history_read on history for select using (is_member(group_id));
-- votos ficam ocultos até a rodada fechar (cada um só vê o próprio)
create policy votes_read on votes for select using (
  is_member(group_id)
  and (user_id = auth.uid() or exists (select 1 from rounds r where r.id = round_id and r.status = 'done'))
);

revoke insert, update, delete, truncate on groups, members, rounds, round_choices, votes, history from anon, authenticated;
grant select on groups, members, rounds, round_choices, votes, history to authenticated;

-- eventos de DELETE com filtro por group_id precisam da linha inteira
alter table members replica identity full;
alter table rounds replica identity full;
alter table round_choices replica identity full;
alter table history replica identity full;

alter publication supabase_realtime add table groups, members, rounds, round_choices, history;

-- ---------------------------------------------------------------- helpers internos

create function _uid() returns uuid language plpgsql stable set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  return auth.uid();
end $$;

-- rodada + garantia de que quem chama é o líder do grupo
create function _leader_round(rid uuid) returns rounds
language plpgsql security definer set search_path = public as $$
declare r rounds;
begin
  select * into r from rounds where id = rid for update;
  if r.id is null then raise exception 'round_not_found'; end if;
  if not exists (select 1 from groups where id = r.group_id and leader_id = _uid()) then
    raise exception 'forbidden';
  end if;
  return r;
end $$;

create function _all_ready(r rounds) returns boolean
language sql stable set search_path = public as $$
  select count(*) >= 2 and bool_and(coalesce(rc.ready, false))
  from members m
  left join round_choices rc on rc.round_id = r.id and rc.member_id = m.id
  where m.id = any (r.participants)
$$;

-- ---------------------------------------------------------------- grupo e membros

create function group_preview(gid uuid)
returns table (name text, member_count int, leader_name text)
language sql security definer stable set search_path = public as $$
  select g.name,
         (select count(*)::int from members where group_id = g.id),
         (select m.name from members m where m.group_id = g.id and m.user_id = g.leader_id)
  from groups g where g.id = gid
$$;

create function create_group(p_name text, p_leader_name text, p_lastfm text default null) returns uuid
language plpgsql security definer set search_path = public as $$
declare gid uuid;
begin
  insert into groups (name, leader_id) values (trim(p_name), _uid()) returning id into gid;
  insert into members (group_id, user_id, name, lastfm_user)
  values (gid, auth.uid(), trim(p_leader_name), nullif(trim(p_lastfm), ''));
  return gid;
end $$;

create function join_group(gid uuid, p_name text, p_lastfm text default null) returns uuid
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
  return mid;
end $$;

create function update_profile(gid uuid, p_name text, p_lastfm text default null) returns void
language plpgsql security definer set search_path = public as $$
begin
  update members set name = trim(p_name), lastfm_user = nullif(trim(p_lastfm), '')
  where group_id = gid and user_id = _uid();
end $$;

create function touch_member(gid uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update members set last_seen = now() where group_id = gid and user_id = _uid();
end $$;

-- líder remove qualquer outro membro; membro comum pode sair (remover a si mesmo)
create function remove_member(mid uuid) returns void
language plpgsql security definer set search_path = public as $$
declare m members; g groups;
begin
  select * into m from members where id = mid;
  if m.id is null then return; end if;
  select * into g from groups where id = m.group_id;
  if m.user_id = g.leader_id then raise exception 'leader_cannot_leave'; end if;
  if g.leader_id <> _uid() and m.user_id <> auth.uid() then raise exception 'forbidden'; end if;
  delete from members where id = mid;
end $$;

create function transfer_leadership(gid uuid, mid uuid) returns void
language plpgsql security definer set search_path = public as $$
declare new_leader uuid;
begin
  if not exists (select 1 from groups where id = gid and leader_id = _uid()) then raise exception 'forbidden'; end if;
  select user_id into new_leader from members where id = mid and group_id = gid;
  if new_leader is null then raise exception 'member_not_found'; end if;
  update groups set leader_id = new_leader where id = gid;
end $$;

-- qualquer membro assume se o líder ficou 7 dias sem aparecer
create function claim_leadership(gid uuid) returns void
language plpgsql security definer set search_path = public as $$
declare g groups;
begin
  select * into g from groups where id = gid;
  if g.id is null or not is_member(gid) then raise exception 'forbidden'; end if;
  if exists (select 1 from members where group_id = gid and user_id = g.leader_id and last_seen > now() - interval '7 days') then
    raise exception 'leader_active';
  end if;
  update groups set leader_id = auth.uid() where id = gid;
end $$;

-- ---------------------------------------------------------------- rodadas

create function start_round(gid uuid, p_mode text, p_kind text) returns uuid
language plpgsql security definer set search_path = public as $$
declare rid uuid; ids uuid[];
begin
  if not exists (select 1 from groups where id = gid and leader_id = _uid()) then raise exception 'forbidden'; end if;
  select array_agg(id) into ids from members where group_id = gid;
  if coalesce(array_length(ids, 1), 0) < 2 then raise exception 'need_two_members'; end if;
  delete from rounds where group_id = gid and status <> 'done';
  insert into rounds (group_id, mode, kind, participants) values (gid, p_mode, p_kind, ids) returning id into rid;
  insert into round_choices (round_id, member_id, group_id, items)
  select rid, m.id, gid, coalesce(m.last_choices -> p_mode, '[]'::jsonb) from members m where m.group_id = gid;
  update groups set last_mode = p_mode, last_kind = p_kind where id = gid;
  return rid;
end $$;

create function set_choices(rid uuid, p_items jsonb, p_ready boolean) returns void
language plpgsql security definer set search_path = public as $$
declare r rounds; mid uuid;
begin
  select * into r from rounds where id = rid;
  if r.id is null or r.status <> 'choosing' then raise exception 'round_locked'; end if;
  select id into mid from members where group_id = r.group_id and user_id = _uid();
  if mid is null or not (mid = any (r.participants)) then raise exception 'forbidden'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) > 5 then raise exception 'invalid_items'; end if;
  if p_ready and jsonb_array_length(p_items) < 1 then raise exception 'invalid_items'; end if;
  update round_choices set items = p_items, ready = p_ready where round_id = rid and member_id = mid;
  update members set last_choices = last_choices || jsonb_build_object(r.mode, p_items) where id = mid;
end $$;

-- sorteio: líder grava o resultado já calculado; todos assistem à mesma roleta
create function publish_draw(rid uuid, p_result jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare r rounds;
begin
  r := _leader_round(rid);
  if r.kind <> 'draw' or r.status not in ('choosing', 'drawing') then raise exception 'round_locked'; end if;
  if r.status = 'choosing' and not _all_ready(r) then raise exception 'not_ready'; end if;
  update rounds set result = p_result, status = 'drawing', spin = spin + 1, result_at = now() where id = rid;
end $$;

create function back_to_choosing(rid uuid) returns void
language plpgsql security definer set search_path = public as $$
declare r rounds;
begin
  r := _leader_round(rid);
  if r.status <> 'drawing' then raise exception 'round_locked'; end if;
  update rounds set status = 'choosing', result = null, result_at = null where id = rid;
end $$;

create function confirm_draw(rid uuid) returns void
language plpgsql security definer set search_path = public as $$
declare r rounds;
begin
  r := _leader_round(rid);
  if r.status <> 'drawing' or r.result is null then raise exception 'round_locked'; end if;
  insert into history (group_id, album_id, album, round_id)
  values (r.group_id, r.result -> 'album' ->> 'id', r.result -> 'album', rid)
  on conflict (group_id, album_id) do nothing;
  update rounds set status = 'done' where id = rid;
end $$;

-- votação
create function publish_vote(rid uuid, p_candidates jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare r rounds;
begin
  r := _leader_round(rid);
  if r.kind <> 'vote' or r.status <> 'choosing' then raise exception 'round_locked'; end if;
  if not _all_ready(r) then raise exception 'not_ready'; end if;
  if jsonb_typeof(p_candidates) <> 'array' or jsonb_array_length(p_candidates) not between 2 and 6 then
    raise exception 'invalid_candidates';
  end if;
  update rounds set candidates = p_candidates, status = 'voting' where id = rid;
  update round_choices set voted = false where round_id = rid;
end $$;

create function cast_vote(rid uuid, p_album_id text) returns void
language plpgsql security definer set search_path = public as $$
declare r rounds; mid uuid;
begin
  select * into r from rounds where id = rid;
  if r.id is null or r.status <> 'voting' then raise exception 'round_locked'; end if;
  select id into mid from members where group_id = r.group_id and user_id = _uid();
  if mid is null or not (mid = any (r.participants)) then raise exception 'forbidden'; end if;
  if not exists (select 1 from jsonb_array_elements(r.candidates) c where c ->> 'id' = p_album_id) then
    raise exception 'invalid_album';
  end if;
  insert into votes (round_id, member_id, group_id, user_id, album_id)
  values (rid, mid, r.group_id, auth.uid(), p_album_id)
  on conflict (round_id, member_id) do update set album_id = excluded.album_id;
  update round_choices set voted = true where round_id = rid and member_id = mid;
end $$;

-- fecha a votação: líder a qualquer momento, qualquer participante quando todos já votaram.
-- Empate é sorteado aqui, no servidor, para ninguém influenciar o resultado.
create function close_vote(rid uuid) returns void
language plpgsql security definer set search_path = public as $$
declare r rounds; all_voted boolean; tied jsonb; winner jsonb; tally jsonb;
begin
  select * into r from rounds where id = rid for update;
  if r.id is null or r.status <> 'voting' then raise exception 'round_locked'; end if;
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

revoke execute on all functions in schema public from public, anon;
grant execute on function group_preview, create_group, join_group, update_profile, touch_member, remove_member,
  transfer_leadership, claim_leadership, start_round, set_choices, publish_draw, back_to_choosing,
  confirm_draw, publish_vote, cast_vote, close_vote, is_member to authenticated;
