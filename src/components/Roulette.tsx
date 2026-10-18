import { animate, motion, useMotionValue } from 'motion/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { seeded } from '@/lib/draw'
import { sfx } from '@/lib/sound'
import type { Album } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Cover } from './Cover'

const W = 132 // largura do card
const GAP = 10
const WIN_IDX = 46
const TOTAL = 58
const SECONDS = 7
const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

interface Props {
  winner: Album
  /** Álbuns usados só para encher a fita. */
  pool: Album[]
  /** Mesmo seed => mesma fita em todos os celulares. */
  seed: string
  /** Muda a cada novo sorteio e reinicia a animação. */
  spinKey: number | string
  /** Pula a animação (ex.: quem abriu a página depois que o sorteio já tinha acabado). */
  skip?: boolean
  onDone?: () => void
}

/** Fita de capas sob uma agulha fixa: acelera, desacelera e para no álbum da noite. */
export function Roulette({ winner, pool, seed, spinKey, skip, onDone }: Props) {
  const box = useRef<HTMLDivElement>(null)
  const x = useMotionValue(0)
  const [done, setDone] = useState(false)
  const onDoneRef = useRef(onDone)
  onDoneRef.current = onDone

  const poolKey = pool.map((a) => a.id).join()
  const { items, jitter } = useMemo(() => {
    const rng = seeded(`${seed}:${spinKey}`)
    const fill = pool.filter((a) => a.id !== winner.id)
    const order = fill.length ? fill.map((_, i) => i).sort(() => rng() - 0.5) : []
    const list: Album[] = Array.from({ length: TOTAL }, (_, i) =>
      i === WIN_IDX ? winner : fill.length ? fill[order[i % order.length]] : { id: `ph${i}`, title: '?', artist: '' },
    )
    return { items: list, jitter: (rng() - 0.5) * W * 0.6 }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [winner.id, poolKey, seed, spinKey])

  useEffect(() => {
    const cw = box.current?.offsetWidth ?? 360
    const target = -(WIN_IDX * (W + GAP) + W / 2 - cw / 2 + jitter)
    setDone(false)
    if (skip || reduceMotion()) {
      x.set(target)
      setDone(true)
      return
    }
    x.set(0)
    let last = -1
    const stopTicks = x.on('change', (v) => {
      const idx = Math.floor((cw / 2 - v) / (W + GAP))
      if (idx === last) return
      last = idx
      sfx.tick(Math.min(1, Math.abs(x.getVelocity()) / 2600))
    })
    sfx.spin(SECONDS)
    const controls = animate(x, target, {
      duration: SECONDS,
      ease: [0.1, 0.75, 0.12, 1],
      onComplete: () => {
        sfx.lock()
        setDone(true)
        onDoneRef.current?.()
      },
    })
    return () => {
      controls.stop()
      stopTicks()
      sfx.hush()
    }
  }, [spinKey, items, jitter, skip, x])

  return (
    <div className="box p-3 pb-2" aria-label="Fita do sorteio" data-done={done}>
      <div ref={box} className="relative h-[12.5rem] overflow-hidden border border-foreground/30 bg-muted">
        <motion.div style={{ x, gap: GAP }} className="relative flex h-full items-start pt-5 will-change-transform">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-2.5 [background-image:repeating-linear-gradient(90deg,var(--foreground)_0_2px,transparent_2px_142px),repeating-linear-gradient(90deg,var(--foreground)_0_1px,transparent_1px_14.2px)] [background-size:100%_100%,100%_55%] [background-repeat:no-repeat] opacity-50"
          />
          {items.map((a, i) => (
            <div
              key={i}
              style={{ width: W }}
              className={cn('relative shrink-0 transition-[opacity,transform,filter] duration-500', done && i !== WIN_IDX && 'opacity-35 grayscale', done && i === WIN_IDX && 'scale-[1.05]')}
            >
              <Cover album={a} size={250} className={cn('w-full', done && i === WIN_IDX && 'ring-[3px] ring-foreground')} />
              <p className="tnum mt-1.5 text-center text-xs font-bold leading-none text-muted-foreground">{a.year ?? ''}</p>
            </div>
          ))}
        </motion.div>
        <div aria-hidden className="pointer-events-none absolute inset-y-0 left-0 w-[12%] bg-gradient-to-r from-muted to-transparent" />
        <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 w-[12%] bg-gradient-to-l from-muted to-transparent" />
        <div aria-hidden className="pointer-events-none absolute bottom-12 top-0 left-1/2 w-[2px] -translate-x-1/2 bg-foreground" />
        <div aria-hidden className="pointer-events-none absolute left-1/2 top-0 size-0 -translate-x-1/2 border-x-[7px] border-t-[10px] border-x-transparent border-t-live" />
      </div>
      <p className="mt-2 text-center text-sm font-bold uppercase tracking-wide text-muted-foreground">{done ? 'Álbum da noite' : 'Sorteando…'}</p>
    </div>
  )
}
