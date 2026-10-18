// Teste de fumaça contra o Supabase real: duas sessões anônimas (líder + membro) percorrem uma rodada de votação.
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
const env = Object.fromEntries(readFileSync(new URL('../.env', import.meta.url), 'utf8').split('\n').filter(Boolean).map((l) => l.split(/=(.*)/s).slice(0, 2)))
const mk = async () => { const c = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY); const { error } = await c.auth.signInAnonymously(); if (error) throw error; return c }
const call = async (c, fn, args) => { const { data, error } = await c.rpc(fn, args); if (error) throw new Error(`${fn}: ${error.message}`); return data }
const A = await mk(), B = await mk()
const gid = await call(A, 'create_group', { p_name: 'Smoke', p_leader_name: 'Ana' })
console.log('group', gid, 'preview(B)', await call(B, 'group_preview', { gid }))
await call(B, 'join_group', { gid, p_name: 'Beto' })
const rid = await call(A, 'start_round', { gid, p_mode: 'artist', p_kind: 'vote' })
await call(A, 'set_choices', { rid, p_items: [{ id: 'a', name: 'A' }], p_ready: true })
await call(B, 'set_choices', { rid, p_items: [{ id: 'b', name: 'B' }], p_ready: true })
await call(A, 'publish_vote', { rid, p_candidates: [{ id: 'x1', title: 'T1' }, { id: 'x2', title: 'T2' }] })
await call(A, 'cast_vote', { rid, p_album_id: 'x1' })
await call(B, 'cast_vote', { rid, p_album_id: 'x2' })
console.log('B sees votes before close:', (await B.from('votes').select('*')).data.length)
await call(A, 'close_vote', { rid })
const { data: round } = await B.from('rounds').select('status,result').eq('id', rid).single()
console.log('round', round.status, JSON.stringify(round.result))
console.log('votes after close:', (await B.from('votes').select('*')).data.length, 'history:', (await B.from('history').select('album_id')).data)
await A.from('groups').delete().eq('id', gid) // deve falhar (sem permissão de escrita direta)
console.log('group still exists:', (await A.from('groups').select('id').eq('id', gid)).data.length === 1)
