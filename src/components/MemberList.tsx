import { AnimatePresence, motion } from 'motion/react'
import { Crown, MoreVertical, UserMinus } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { forgetGroup } from '@/lib/groups'
import type { Group, Member, Round, RoundChoice } from '@/lib/types'
import { sfx } from '@/lib/sound'
import { cn } from '@/lib/utils'
import { Button } from './ui/button'
import { Mark } from './Guide'
import type { MarkState } from './Guide'

interface Props {
  group: Group
  members: Member[]
  me: Member
  isLeader: boolean
  /** Antes da rodada e durante as escolhas: mostra o menu de liderança e remoção. */
  manage: boolean
  /** Rodada ativa (ou null): define as colunas da grade. */
  active: Round | null
  /** Choices da rodada ativa, para mostrar quem já confirmou e quem já votou. */
  choices: RoundChoice[]
}

const fail = (e: Error) => {
  sfx.error()
  toast.error(e.message)
}

const LABEL: Record<MarkState, string> = { done: 'feito', pending: 'aguardando', na: 'não se aplica', off: 'vazio' }

/** A grade: uma linha por pessoa (a sua é azul) e uma coluna por etapa, com o estado em forma de marca. */
export function MemberList({ group, members, me, isLeader, manage, active, choices }: Props) {
  const [open, setOpen] = useState<string | null>(null)
  const nav = useNavigate()
  const voting = active?.kind === 'vote'
  const cols = active ? [{ key: 'ready', label: 'Escolhas' }, ...(voting ? [{ key: 'voted', label: 'Voto' }] : [])] : []

  const state = (m: Member, key: string): MarkState => {
    const c = choices.find((x) => x.member_id === m.id)
    if (!active?.participants.includes(m.id)) return 'na'
    if (key === 'ready') return active.status === 'choosing' ? (c?.ready ? 'done' : 'pending') : 'done'
    return active.status === 'voting' ? (c?.voted ? 'done' : 'pending') : 'na'
  }

  return (
    <div className="box">
      {cols.length > 0 && (
        <div className="flex border-b-[1.5px] border-foreground text-xs font-bold uppercase tracking-wide text-muted-foreground">
          <span className="flex-1 px-3 py-1.5">Pessoa</span>
          {cols.map((c) => (
            <span key={c.key} className="w-[4.5rem] border-l border-foreground/20 py-1.5 text-center">{c.label}</span>
          ))}
          {manage && <span className="w-11" />}
        </div>
      )}
      <ul className="divide-y divide-foreground/20">
        <AnimatePresence initial={false}>
          {members.map((m) => {
            const leader = m.user_id === group.leader_id
            const canMenu = manage && ((isLeader && !leader) || (m.id === me.id && !leader))
            return (
              <motion.li key={m.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="relative flex min-h-14 items-stretch">
                <div className={cn('flex min-w-0 flex-1 items-center gap-2 px-3 py-2', m.id === me.id ? 'you' : 'bg-card')}>
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 text-base font-bold leading-tight">
                      <span className="truncate">{m.name}</span>
                      {leader && <Crown className="size-4 shrink-0" aria-label="Líder" />}
                      {m.id === me.id && <span className="text-xs font-medium opacity-80">(você)</span>}
                    </p>
                  </div>
                </div>
                {cols.map((c) => {
                  const s = state(m, c.key)
                  return (
                    <div key={c.key} className="flex w-[4.5rem] items-center justify-center border-l border-foreground/20" role="img" aria-label={`${c.label}: ${LABEL[s]}`}>
                      <Mark state={s} />
                    </div>
                  )
                })}
                {canMenu ? (
                  <button
                    type="button"
                    aria-label={`Opções de ${m.name}`}
                    aria-expanded={open === m.id}
                    className="flex w-11 items-center justify-center border-l border-foreground/20 hover:bg-muted"
                    onClick={() => setOpen(open === m.id ? null : m.id)}
                  >
                    <MoreVertical className="size-5" />
                  </button>
                ) : (
                  manage && <span className="w-11 border-l border-foreground/20" />
                )}
                {open === m.id && (
                  <div className="absolute right-2 top-full z-10 mt-1 flex flex-col border-[1.5px] border-foreground bg-popover p-1 shadow-[0_10px_20px_-8px_rgb(0_0_0/0.35)]">
                    {isLeader && m.id !== me.id && (
                      <Button variant="ghost" size="sm" onClick={() => { setOpen(null); api.transferLeadership(group.id, m.id).then(() => toast.success(`${m.name} agora é o líder`), fail) }}>
                        <Crown /> Passar liderança
                      </Button>
                    )}
                    <Button variant="destructive" size="sm" onClick={() => { setOpen(null); api.removeMember(m.id).then(() => { if (m.id === me.id) { forgetGroup(group.id); nav('/') } }, fail) }}>
                      <UserMinus /> {m.id === me.id ? 'Sair do grupo' : 'Remover'}
                    </Button>
                  </div>
                )}
              </motion.li>
            )
          })}
        </AnimatePresence>
      </ul>
      {cols.length > 0 && (
        <p className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t-[1.5px] border-foreground px-3 py-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5"><Mark state="done" className="size-3" /> feito</span>
          <span className="flex items-center gap-1.5"><Mark state="pending" className="size-3" /> aguardando</span>
          <span className="flex items-center gap-1.5"><Mark state="na" /> não se aplica</span>
        </p>
      )}
    </div>
  )
}
