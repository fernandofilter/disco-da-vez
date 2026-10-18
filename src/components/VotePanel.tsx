import { motion } from 'motion/react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { sfx } from '@/lib/sound'
import type { Album } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Cover } from './Cover'
import { Mark } from './Guide'

/** Seis programas na grade; o voto é secreto até a rodada fechar e pode ser trocado. O escolhido inverte para tinta cheia. */
export function VotePanel({ roundId, candidates, myVote }: { roundId: string; candidates: Album[]; myVote?: string }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {candidates.map((a, i) => {
        const picked = myVote === a.id
        return (
          <motion.button
            key={a.id}
            type="button"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            onClick={() =>
              api.castVote(roundId, a.id).then(
                () => sfx.vote(),
                (e: Error) => {
                  sfx.error()
                  toast.error(e.message)
                },
              )
            }
            aria-pressed={picked}
            className={cn(
              'box flex flex-col gap-2 p-2 text-left transition-colors',
              picked ? 'bg-foreground text-background' : 'hover:bg-muted',
            )}
          >
            <Cover album={a} className="w-full" />
            <div className="flex items-start gap-2 px-0.5 pb-0.5">
              <Mark state={picked ? 'done' : 'off'} className={cn('mt-0.5', picked && 'border-background bg-background')} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold leading-tight">{a.title}</p>
                <p className={cn('truncate text-xs', picked ? 'text-background/75' : 'text-muted-foreground')}>{a.artist}{a.year ? ` · ${a.year}` : ''}</p>
              </div>
            </div>
            {picked && <span className="sr-only">Seu voto</span>}
          </motion.button>
        )
      })}
    </div>
  )
}
