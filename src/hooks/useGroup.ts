import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '@/lib/api'
import { ensureSession, supabase } from '@/lib/supabase'
import type { Group, HistoryItem, Member, Round, RoundChoice, RoundMeta, Vote } from '@/lib/types'

export interface GroupState {
  userId: string
  group: Group
  members: Member[]
  me: Member | null
  round: Round | null
  /** Todas as rodadas do grupo, da primeira à última: o número de uma rodada é a posição aqui. */
  rounds: RoundMeta[]
  choices: RoundChoice[]
  votes: Vote[]
  history: HistoryItem[]
}

type Load = { status: 'loading' } | { status: 'error'; message: string } | { status: 'outsider' } | { status: 'ready'; data: GroupState }

const TABLES = ['members', 'rounds', 'round_choices', 'history'] as const

/** Carrega o estado do grupo e refaz a leitura a cada mudança em tempo real (dados pequenos, refetch é mais simples que patch). */
export function useGroup(gid: string) {
  const [state, setState] = useState<Load>({ status: 'loading' })
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

  const refresh = useCallback(async () => {
    try {
      const userId = await ensureSession()
      const { data: group } = await supabase.from('groups').select('*').eq('id', gid).maybeSingle()
      if (!group) return setState({ status: 'outsider' })
      const [members, rounds, roundList, history] = await Promise.all([
        supabase.from('members').select('*').eq('group_id', gid).order('joined_at'),
        supabase.from('rounds').select('*').eq('group_id', gid).order('created_at', { ascending: false }).limit(1),
        supabase.from('rounds').select('id, kind, mode, created_at').eq('group_id', gid).order('created_at'),
        supabase.from('history').select('id, album_id, album, round_id, confirmed_at').eq('group_id', gid).order('confirmed_at', { ascending: false }),
      ])
      const round = (rounds.data?.[0] as Round | undefined) ?? null
      const [choices, votes] = round
        ? await Promise.all([
            supabase.from('round_choices').select('*').eq('round_id', round.id),
            supabase.from('votes').select('round_id, member_id, album_id').eq('round_id', round.id),
          ])
        : [null, null]
      const list = (members.data ?? []) as Member[]
      setState({
        status: 'ready',
        data: {
          userId,
          group: group as Group,
          members: list,
          me: list.find((m) => m.user_id === userId) ?? null,
          round,
          rounds: (roundList.data ?? []) as RoundMeta[],
          choices: (choices?.data ?? []) as RoundChoice[],
          votes: (votes?.data ?? []) as Vote[],
          history: (history.data ?? []) as HistoryItem[],
        },
      })
    } catch (e) {
      setState({ status: 'error', message: e instanceof Error ? e.message : 'Erro ao carregar o grupo' })
    }
  }, [gid])

  useEffect(() => {
    const later = () => {
      clearTimeout(timer.current)
      timer.current = setTimeout(refresh, 150)
    }
    refresh()
    api.touch(gid).catch(() => {})
    let channel = supabase.channel(`group:${gid}`).on('postgres_changes', { event: '*', schema: 'public', table: 'groups', filter: `id=eq.${gid}` }, later)
    for (const t of TABLES) channel = channel.on('postgres_changes', { event: '*', schema: 'public', table: t, filter: `group_id=eq.${gid}` }, later)
    channel.subscribe((s) => s === 'SUBSCRIBED' && later())
    // celular em segundo plano perde o websocket: ao voltar, relê tudo
    const onVisible = () => document.visibilityState === 'visible' && later()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearTimeout(timer.current)
      document.removeEventListener('visibilitychange', onVisible)
      supabase.removeChannel(channel)
    }
  }, [gid, refresh])

  return { state, refresh }
}
