import { motion } from 'motion/react'
import { Check } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import type { Album } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Cover } from './Cover'

/** 6 álbuns em grade; o voto é secreto até a rodada fechar e pode ser trocado antes disso. */
export function VotePanel({ roundId, candidates, myVote }: { roundId: string; candidates: Album[]; myVote?: string }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {candidates.map((a, i) => {
        const picked = myVote === a.id
        return (
          <motion.button
            key={a.id}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08, type: 'spring', stiffness: 180, damping: 18 }}
            whileHover={{ y: -4 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => api.castVote(roundId, a.id).catch((e: Error) => toast.error(e.message))}
            aria-pressed={picked}
            className={cn('group relative overflow-hidden rounded-xl border bg-card text-left transition-shadow', picked && 'ring-2 ring-primary shadow-[0_0_28px_-6px] shadow-primary')}
          >
            <Cover album={a} className="w-full" />
            {picked && (
              <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Check className="size-4" />
              </motion.span>
            )}
            <div className="p-2.5">
              <p className="truncate text-sm font-semibold">{a.title}</p>
              <p className="truncate text-xs text-muted-foreground">{a.artist}{a.year ? ` · ${a.year}` : ''}</p>
            </div>
          </motion.button>
        )
      })}
    </div>
  )
}
