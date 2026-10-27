-- Avisos no celular (Web Push): quem ativa o sino no grupo recebe o andamento da rodada mesmo com o navegador fechado.
-- Cada mudança de etapa (rodada aberta, todos escolheram, roleta parou, votação aberta/encerrada, disco confirmado)
-- dispara, pelo pg_net, a Edge Function `push`, que manda o aviso para os aparelhos inscritos (menos o de quem fez a ação).
-- Sem a configuração do Vault (ver README, "Avisos no celular") os gatilhos não fazem nada: a rodada nunca depende do aviso.
-- Rode no SQL Editor do Supabase (ou `supabase db push`) depois das migrações anteriores. Pode rodar de novo sem erro.

create extension if not exists pg_net with schema extensions;

create table if not exists push_subscriptions (
  member_id uuid not null references members on delete cascade,
  endpoint text not null check (endpoint ~ '^https://' and char_length(endpoint) <= 1000),
  p256dh text not null check (char_length(p256dh) between 1 and 200),
  auth text not null check (char_length(auth) between 1 and 100),
  created_at timestamptz not null default now(),
  primary key (member_id, endpoint)
);

alter table push_subscriptions enable row level security;
-- cada um só enxerga as próprias inscrições (para o sino saber se está ligado); escrita só pelas funções abaixo
drop policy if exists push_read on push_subscriptions;
create policy push_read on push_subscriptions for select using (
  exists (select 1 from members m where m.id = member_id and m.user_id = auth.uid())
);
revoke insert, update, delete, truncate on push_subscriptions from anon, authenticated;
grant select on push_subscriptions to authenticated;

-- ---------------------------------------------------------------- inscrição (o sino)

create or replace function save_push(gid uuid, p_endpoint text, p_p256dh text, p_auth text) returns void
language plpgsql security definer set search_path = public as $$
declare mid uuid;
begin
  select id into mid from members where group_id = gid and user_id = _uid();
  if mid is null then raise exception 'forbidden'; end if;
  insert into push_subscriptions (member_id, endpoint, p256dh, auth)
  values (mid, p_endpoint, p_p256dh, p_auth)
  on conflict (member_id, endpoint) do update set p256dh = excluded.p256dh, auth = excluded.auth, created_at = now();
end $$;

create or replace function delete_push(gid uuid, p_endpoint text) returns void
language plpgsql security definer set search_path = public as $$
begin
  delete from push_subscriptions s using members m
  where s.member_id = m.id and m.group_id = gid and m.user_id = _uid() and s.endpoint = p_endpoint;
end $$;

revoke execute on function save_push, delete_push from public, anon;
grant execute on function save_push, delete_push to authenticated;

-- ---------------------------------------------------------------- disparo

-- Chama a Edge Function sem esperar (o pg_net envia depois do commit). Endereço e segredo ficam no Vault:
--   select vault.create_secret('https://<projeto>.supabase.co/functions/v1/push', 'push_url');
--   select vault.create_secret('<o mesmo PUSH_SECRET da função>', 'push_secret');
create or replace function _push(rid uuid, p_event text) returns void
language plpgsql security definer set search_path = public as $$
declare url text; secret text;
begin
  select decrypted_secret into url from vault.decrypted_secrets where name = 'push_url';
  select decrypted_secret into secret from vault.decrypted_secrets where name = 'push_secret';
  if url is null or secret is null then return; end if;
  perform net.http_post(
    url := url,
    body := jsonb_build_object('round_id', rid, 'event', p_event, 'actor', auth.uid()),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-secret', secret),
    timeout_milliseconds := 10000
  );
exception when others then
  raise warning 'push %: %', p_event, sqlerrm; -- aviso que falha nunca derruba a rodada
end $$;

revoke execute on function _push from public, anon, authenticated;

create or replace function _round_push() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    perform _push(new.id, 'round_open');
  elsif new.status = 'drawing' and new.result -> 'album' is not null and old.result -> 'album' is null then
    perform _push(new.id, 'draw_result'); -- vale também para "sortear de novo" (begin_deal limpa o resultado antes)
  elsif new.status = 'voting' and new.candidates is not null and old.candidates is null then
    perform _push(new.id, 'vote_open');
  elsif old.status = 'voting' and new.status = 'done' then
    perform _push(new.id, 'vote_result');
  elsif old.status = 'drawing' and new.status = 'done' then
    perform _push(new.id, 'draw_confirmed');
  end if;
  return new;
end $$;

drop trigger if exists rounds_push on rounds;
create trigger rounds_push after insert or update on rounds for each row execute function _round_push();

-- a última pessoa confirmou as escolhas: avisa o líder que dá para sortear ou abrir a votação
create or replace function _choice_push() returns trigger
language plpgsql security definer set search_path = public as $$
declare r rounds;
begin
  if new.ready and not old.ready then
    select * into r from rounds where id = new.round_id;
    if r.status = 'choosing' and _all_ready(r) then perform _push(r.id, 'all_ready'); end if;
  end if;
  return new;
end $$;

drop trigger if exists round_choices_push on round_choices;
create trigger round_choices_push after update of ready on round_choices for each row execute function _choice_push();

revoke execute on function _round_push, _choice_push from public, anon, authenticated;

notify pgrst, 'reload schema';
