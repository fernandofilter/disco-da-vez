// Membro simulado para testes manuais: node scripts/member.mjs <groupId> <nome> [comandos...]
// comandos: choices=<mbid:nome,...>  (confirma escolhas na rodada ativa)  |  vote=<n>  (vota no n-ésimo candidato)
import { createClient } from '@supabase/supabase-js'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
const env = Object.fromEntries(readFileSync(new URL('../.env', import.meta.url), 'utf8').split('\n').filter(Boolean).map((l) => l.split(/=(.*)/s).slice(0, 2)))
const [gid, name, ...cmds] = process.argv.slice(2)
const file = new URL(`./.session-${name}.json`, import.meta.url)
const c = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY)
if (existsSync(file)) await c.auth.setSession(JSON.parse(readFileSync(file, 'utf8')))
let { data: { session } } = await c.auth.getSession()
if (!session) ({ data: { session } } = await c.auth.signInAnonymously())
writeFileSync(file, JSON.stringify({ access_token: session.access_token, refresh_token: session.refresh_token }))
const call = async (fn, args) => { const { data, error } = await c.rpc(fn, args); if (error) throw new Error(`${fn}: ${error.message}`); return data }
await call('join_group', { gid, p_name: name })
const { data: [round] } = await c.from('rounds').select('*').eq('group_id', gid).order('created_at', { ascending: false }).limit(1)
for (const cmd of cmds) {
  const [k, v] = cmd.split(/=(.*)/s)
  if (k === 'choices') await call('set_choices', { rid: round.id, p_items: v.split(',').map((s) => { const [id, ...n] = s.split(':'); return { id, name: n.join(':') } }), p_ready: true })
  if (k === 'vote') await call('cast_vote', { rid: round.id, p_album_id: round.candidates[Number(v)].id })
}
console.log('ok', name, round?.status)
