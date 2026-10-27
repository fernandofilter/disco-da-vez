import { ensureSession, supabase } from './supabase'
import type { Album, Choice, DrawResult, Kind, Mode } from './types'

const MESSAGES: Record<string, string> = {
  group_full: 'Este grupo já tem 6 pessoas.',
  group_not_found: 'Grupo não encontrado.',
  forbidden: 'Só o líder pode fazer isso.',
  need_two_members: 'Precisa de pelo menos 2 pessoas no grupo.',
  not_ready: 'Ainda falta alguém confirmar as escolhas.',
  round_locked: 'A rodada já mudou de etapa, atualize a tela.',
  leader_cannot_leave: 'O líder precisa passar a liderança antes de sair.',
  leader_active: 'O líder ainda está ativo (menos de 7 dias sem aparecer).',
}

async function rpc<T = void>(fn: string, args: Record<string, unknown>): Promise<T> {
  await ensureSession()
  const { data, error } = await supabase.rpc(fn, args)
  if (error) {
    const known = Object.keys(MESSAGES).find((k) => error.message.includes(k))
    throw new Error(known ? MESSAGES[known] : error.message)
  }
  return data as T
}

export const api = {
  preview: async (gid: string) => {
    const rows = await rpc<{ name: string; member_count: number; leader_name: string; is_leader?: boolean }[]>('group_preview', { gid })
    return rows[0] ?? null
  },
  createGroup: (name: string, leader: string) => rpc<string>('create_group', { p_name: name, p_leader_name: leader }),
  join: (gid: string, name: string) => rpc<string>('join_group', { gid, p_name: name }),
  touch: (gid: string) => rpc('touch_member', { gid }),
  removeMember: (mid: string) => rpc('remove_member', { mid }),
  /** Sair do grupo sem estar na página dele: acha a própria linha de membro e remove. */
  leaveGroup: async (gid: string) => {
    const uid = await ensureSession()
    const { data } = await supabase.from('members').select('id').eq('group_id', gid).eq('user_id', uid).maybeSingle()
    if (data) await rpc('remove_member', { mid: data.id })
  },
  transferLeadership: (gid: string, mid: string) => rpc('transfer_leadership', { gid, mid }),
  claimLeadership: (gid: string) => rpc('claim_leadership', { gid }),
  startRound: (gid: string, mode: Mode, kind: Kind) => rpc<string>('start_round', { gid, p_mode: mode, p_kind: kind }),
  setChoices: (rid: string, items: Choice[], ready: boolean) => rpc('set_choices', { rid, p_items: items, p_ready: ready }),
  beginDeal: (rid: string) => rpc('begin_deal', { rid }),
  publishDraw: (rid: string, result: DrawResult) => rpc('publish_draw', { rid, p_result: result }),
  backToChoosing: (rid: string) => rpc('back_to_choosing', { rid }),
  confirmDraw: (rid: string) => rpc('confirm_draw', { rid }),
  publishVote: (rid: string, candidates: Album[], filler: Album[]) => rpc('publish_vote', { rid, p_candidates: candidates, p_filler: filler }),
  castVote: (rid: string, albumId: string) => rpc('cast_vote', { rid, p_album_id: albumId }),
  closeVote: (rid: string) => rpc('close_vote', { rid }),
  deleteGroup: (gid: string) => rpc('delete_group', { gid }),
  deleteHistoryItem: (hid: string) => rpc('delete_history_item', { hid }),
  savePush: (gid: string, endpoint: string, p256dh: string, auth: string) => rpc('save_push', { gid, p_endpoint: endpoint, p_p256dh: p256dh, p_auth: auth }),
  deletePush: (gid: string, endpoint: string) => rpc('delete_push', { gid, p_endpoint: endpoint }),
}
