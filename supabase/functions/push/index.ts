// Edge Function `push`: manda o aviso de andamento da rodada para os celulares inscritos no grupo.
// Quem chama é o banco (gatilhos da migração 0007, via pg_net), nunca o navegador: por isso o deploy é com --no-verify-jwt
// e a chamada só vale com o cabeçalho x-push-secret certo.
// Segredos (supabase secrets set): VAPID_KEYS (JSON de `node scripts/make-vapid.mjs`), PUSH_SECRET e, opcional, VAPID_SUBJECT.
import { createClient } from 'jsr:@supabase/supabase-js@2'
import * as webpush from 'jsr:@negrel/webpush@0.5.0'

type Album = { title: string; artist: string }
type Round = {
  id: string
  group_id: string
  kind: 'draw' | 'vote'
  mode: 'artist' | 'genre' | 'album'
  status: string
  result: { album?: Album } | null
  candidates: Album[] | null
  created_at: string
}
type Event = 'round_open' | 'all_ready' | 'draw_result' | 'vote_open' | 'vote_result' | 'draw_confirmed'

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })
const vapidKeys = await webpush.importVapidKeys(JSON.parse(Deno.env.get('VAPID_KEYS') ?? '{}'))
const subject = Deno.env.get('VAPID_SUBJECT') ?? 'https://disco.fltr.com.br'

const disc = (a?: Album) => (a ? `${a.title}, de ${a.artist}` : null)

/** O texto do aviso (título = nome do grupo). null quando a rodada já não está na etapa do evento. */
function message(event: Event, r: Round, no: number): string | null {
  const what = r.mode === 'artist' ? 'suas bandas' : r.mode === 'album' ? 'seus álbuns' : 'seus gêneros'
  switch (event) {
    case 'round_open':
      return r.status === 'choosing' ? `Rodada #${no} aberta: escolha ${what} para ${r.kind === 'vote' ? 'a votação' : 'o sorteio'}.` : null
    case 'all_ready':
      return r.status === 'choosing' ? `Todo mundo escolheu: ${r.kind === 'vote' ? 'pode abrir a votação' : 'pode girar a roleta'}.` : null
    case 'draw_result':
      return r.result?.album ? `A roleta parou: ${disc(r.result.album)}.` : null
    case 'vote_open':
      return r.status === 'voting' && r.candidates ? `Votação aberta: ${r.candidates.length} discos na disputa da rodada #${no}. Vote no seu.` : null
    case 'vote_result':
      return r.result?.album ? `Votação encerrada: deu ${disc(r.result.album)}.` : null
    case 'draw_confirmed':
      return r.result?.album ? `Disco da vez: vamos ouvir ${disc(r.result.album)}.` : null
  }
}

const ok = (body: unknown) => Response.json(body)

Deno.serve(async (req) => {
  const secret = Deno.env.get('PUSH_SECRET')
  if (!secret || req.headers.get('x-push-secret') !== secret) return new Response('forbidden', { status: 403 })
  const { round_id, event, actor } = (await req.json()) as { round_id: string; event: Event; actor: string | null }

  const { data: round } = await db.from('rounds').select('id, group_id, kind, mode, status, result, candidates, created_at').eq('id', round_id).maybeSingle<Round>()
  if (!round) return ok({ sent: 0, why: 'rodada não existe mais' })
  const [{ data: group }, { data: members }, { count }] = await Promise.all([
    db.from('groups').select('name, leader_id').eq('id', round.group_id).single<{ name: string; leader_id: string }>(),
    db.from('members').select('id, user_id').eq('group_id', round.group_id),
    db.from('rounds').select('id', { count: 'exact', head: true }).eq('group_id', round.group_id).lte('created_at', round.created_at),
  ])
  const body = group && message(event, round, count ?? 1)
  if (!group || !body) return ok({ sent: 0, why: 'etapa já mudou' })

  // quem fez a ação já sabe; "todo mundo escolheu" só interessa ao líder
  const to = (members ?? []).filter((m) => m.user_id !== actor && (event !== 'all_ready' || m.user_id === group.leader_id)).map((m) => m.id)
  if (!to.length) return ok({ sent: 0 })
  const { data: subs } = await db.from('push_subscriptions').select('member_id, endpoint, p256dh, auth').in('member_id', to)
  if (!subs?.length) return ok({ sent: 0 })

  const path = `/g/${round.group_id}`
  // a mesma tag por grupo: o aviso novo substitui o anterior em vez de empilhar
  const payload = JSON.stringify({ title: group.name, body, url: path, tag: `grupo-${round.group_id}` })
  const server = await webpush.ApplicationServer.new({ contactInformation: subject, vapidKeys })
  const results = await Promise.allSettled(
    subs.map((s) =>
      server.subscribe({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }).pushTextMessage(payload, { urgency: webpush.Urgency.High, ttl: 6 * 3600 }),
    ),
  )
  // inscrição que o serviço de push não reconhece mais (desinstalou, limpou dados, revogou): sai da lista
  const gone = subs.filter((_, i) => {
    const r = results[i]
    return r.status === 'rejected' && r.reason instanceof webpush.PushMessageError && [404, 410].includes(r.reason.response.status)
  })
  for (const s of gone) await db.from('push_subscriptions').delete().eq('member_id', s.member_id).eq('endpoint', s.endpoint)
  const failed = results.filter((r) => r.status === 'rejected').length
  if (failed > gone.length) console.error('push', event, results.filter((r) => r.status === 'rejected').map((r) => String((r as PromiseRejectedResult).reason)))
  return ok({ sent: subs.length - failed, gone: gone.length, failed: failed - gone.length })
})
