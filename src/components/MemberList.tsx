import { AnimatePresence, motion } from 'motion/react'
import { Check, Crown, MoreVertical, UserMinus, Vote } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import type { Group, Member, RoundChoice } from '@/lib/types'
import { Badge } from './ui/badge'
import { Button } from './ui/button'

interface Props {
  group: Group
  members: Member[]
  me: Member
  isLeader: boolean
  /** Choices da rodada ativa, para mostrar quem já confirmou. */
  choices: RoundChoice[]
  showStatus: 'ready' | 'voted' | null
}

const fail = (e: Error) => toast.error(e.message)

export function MemberList({ group, members, me, isLeader, choices, showStatus }: Props) {
  const [open, setOpen] = useState<string | null>(null)
  return (
    <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      <AnimatePresence initial={false}>
        {members.map((m) => {
          const c = choices.find((x) => x.member_id === m.id)
          const leader = m.user_id === group.leader_id
          const done = showStatus === 'ready' ? c?.ready : showStatus === 'voted' ? c?.voted : false
          return (
            <motion.li
              key={m.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative flex items-center gap-3 rounded-xl border bg-card px-3 py-2"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/15 font-semibold text-primary">{m.name[0]?.toUpperCase()}</span>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 truncate font-medium">
                  {m.name}
                  {leader && <Crown className="size-3.5 text-amber-400" aria-label="Líder" />}
                  {m.id === me.id && <span className="text-xs text-muted-foreground">(você)</span>}
                </p>
                {m.lastfm_user && <p className="truncate text-xs text-muted-foreground">Last.fm: {m.lastfm_user}</p>}
              </div>
              {showStatus && (
                <Badge variant={done ? 'default' : 'outline'} className="gap-1">
                  {done ? <Check className="size-3" /> : showStatus === 'voted' ? <Vote className="size-3" /> : null}
                  {done ? (showStatus === 'ready' ? 'Pronto' : 'Votou') : 'Aguardando'}
                </Badge>
              )}
              {(isLeader && !leader) || (m.id === me.id && !leader) ? (
                <Button variant="ghost" size="icon-sm" aria-label="Opções" onClick={() => setOpen(open === m.id ? null : m.id)}>
                  <MoreVertical />
                </Button>
              ) : null}
              {open === m.id && (
                <div className="absolute right-2 top-12 z-10 flex flex-col rounded-lg border bg-popover p-1 shadow-xl">
                  {isLeader && m.id !== me.id && (
                    <Button variant="ghost" size="sm" onClick={() => { setOpen(null); api.transferLeadership(group.id, m.id).then(() => toast.success(`${m.name} agora é o líder`), fail) }}>
                      <Crown /> Passar liderança
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" className="text-destructive" onClick={() => { setOpen(null); api.removeMember(m.id).catch(fail) }}>
                    <UserMinus /> {m.id === me.id ? 'Sair do grupo' : 'Remover'}
                  </Button>
                </div>
              )}
            </motion.li>
          )
        })}
      </AnimatePresence>
    </ul>
  )
}
