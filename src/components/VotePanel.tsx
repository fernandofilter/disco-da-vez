import { motion } from 'motion/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { seeded, shuffle } from '@/lib/draw'
import { sfx } from '@/lib/sound'
import type { Album } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Cover } from './Cover'
import { Garimpo } from './Garimpo'
import { Mark } from './Guide'
import { Skeleton } from './ui/skeleton'

const SLOTS = 6
const CYCLE_MS = 110 // troca de capas nos slots que ainda não travaram
const FIRST_LOCK_MS = 1100
const LOCK_STEP_MS = 480

/**
 * Seis programas na grade; o voto é secreto até a rodada fechar e pode ser trocado. O escolhido inverte para tinta cheia.
 * Sem `candidates` a busca ainda está rolando (slots em espera). Quando eles chegam, cada slot troca de capa até travar no sorteado,
 * um depois do outro; `reveal=false` (modo Álbuns, ou quem abriu a tela depois) mostra tudo pronto. `watch`: quem entrou depois só assiste.
 */
export function VotePanel({ roundId, candidates, myVote, filler = [], reveal = true, watch = false }: { roundId: string; candidates: Album[] | null; myVote?: string; filler?: Album[]; reveal?: boolean; watch?: boolean }) {
  const wasPending = useRef(!candidates)
  const run = wasPending.current && reveal
  const [locked, setLocked] = useState(candidates && !run ? candidates.length : 0)
  const [tick, setTick] = useState(0)
  const done = locked >= SLOTS || (candidates !== null && locked >= candidates.length)

  const key = candidates?.map((a) => a.id).join() ?? ''
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const deck = useMemo(() => shuffle([...filler, ...(candidates ?? [])], seeded(roundId)), [roundId, key, filler.length])

  useEffect(() => {
    if (!candidates) return
    if (!run) return setLocked(candidates.length)
    const timers = candidates.map((_, i) =>
      setTimeout(() => {
        setLocked(i + 1)
        if (i === candidates.length - 1) sfx.lock()
        else sfx.tick(0.9)
      }, FIRST_LOCK_MS + i * LOCK_STEP_MS),
    )
    const cycle = setInterval(() => setTick((t) => t + 1), CYCLE_MS)
    const stop = setTimeout(() => clearInterval(cycle), FIRST_LOCK_MS + candidates.length * LOCK_STEP_MS)
    return () => {
      timers.forEach(clearTimeout)
      clearTimeout(stop)
      clearInterval(cycle)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, run])

  if (!candidates) return <Garimpo hint="Buscando 6 álbuns nas escolhas do grupo" />

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3" aria-busy={!done}>
      {candidates.map((a, i) => {
        const open = Boolean(a) && i < locked // travou: mostra o sorteado
        const shown = open ? a! : a ? deck[(tick + i * 5) % deck.length] : { id: `ph${i}`, title: '?' }
        const picked = open && myVote === a!.id
        return (
          <motion.button
            key={i}
            type="button"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            disabled={!open || !done || watch}
            onClick={() =>
              api.castVote(roundId, a!.id).then(
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
              picked ? 'bg-foreground text-background' : done && !watch && 'hover:bg-muted',
              !a && 'animate-pulse',
            )}
          >
            <Cover album={shown} className="w-full" />
            <div className="flex items-start gap-2 px-0.5 pb-0.5">
              {open ? (
                <>
                  <Mark state={picked ? 'done' : 'off'} className={cn('mt-0.5', picked && 'border-background bg-background')} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold leading-tight">{a!.title}</p>
                    <p className={cn('truncate text-xs', picked ? 'text-background/75' : 'text-muted-foreground')}>{a!.artist}{a!.year ? ` · ${a!.year}` : ''}</p>
                  </div>
                </>
              ) : (
                <div aria-hidden className="w-full space-y-1.5 py-0.5">
                  <Skeleton className="h-3.5 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              )}
            </div>
            {picked && <span className="sr-only">Seu voto</span>}
          </motion.button>
        )
      })}
    </div>
  )
}
