import { animate, motion, useMotionValue } from 'motion/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { seeded } from '@/lib/draw'
import type { Album } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Cover } from './Cover'

const W = 132 // largura do card
const GAP = 10
const WIN_IDX = 46
const TOTAL = 58
const RARITY = ['#71717a', '#3b82f6', '#8b5cf6', '#d946ef', '#ef4444', '#eab308']
const rarity = (id: string) => RARITY[[...id].reduce((h, c) => h + c.charCodeAt(0), 0) % RARITY.length]
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

/** Fita horizontal estilo abertura de caixa do CS2: acelera, desacelera e para sob o marcador central. */
export function Roulette({ winner, pool, seed, spinKey, skip, onDone }: Props) {
  const box = useRef<HTMLDivElement>(null)
  const x = useMotionValue(0)
  const [done, setDone] = useState(false)
  const onDoneRef = useRef(onDone)
  onDoneRef.current = onDone

  const { items, jitter } = useMemo(() => {
    const rng = seeded(`${seed}:${spinKey}`)
    const fill = pool.filter((a) => a.id !== winner.id)
    const order = fill.length ? fill.map((_, i) => i).sort(() => rng() - 0.5) : []
    const list: Album[] = Array.from({ length: TOTAL }, (_, i) =>
      i === WIN_IDX ? winner : fill.length ? fill[order[i % order.length]] : { id: `ph${i}`, title: '?', artist: '' },
    )
    return { items: list, jitter: (rng() - 0.5) * W * 0.6 }
  }, [winner, pool, seed, spinKey])

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
    const controls = animate(x, target, {
      duration: 7,
      ease: [0.1, 0.75, 0.12, 1],
      onComplete: () => {
        setDone(true)
        onDoneRef.current?.()
      },
    })
    return () => controls.stop()
  }, [spinKey, items, jitter, skip, x])

  return (
    <div
      ref={box}
      className="relative h-44 overflow-hidden rounded-2xl border bg-card/60 py-4 [mask-image:linear-gradient(90deg,transparent,#000_12%,#000_88%,transparent)]"
      aria-label="Roleta de sorteio"
    >
      <motion.div style={{ x, gap: GAP }} className="flex h-full will-change-transform">
        {items.map((a, i) => (
          <div
            key={i}
            style={{ width: W, borderBottomColor: rarity(a.id) }}
            className={cn(
              'relative shrink-0 overflow-hidden rounded-lg border-b-4 transition-all duration-500',
              done && i !== WIN_IDX && 'opacity-30 saturate-50',
              done && i === WIN_IDX && 'scale-105 shadow-[0_0_32px_-4px] shadow-primary',
            )}
          >
            <Cover album={a} size={250} className="size-full" />
          </div>
        ))}
      </motion.div>
      <div className="pointer-events-none absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-primary shadow-[0_0_14px_2px] shadow-primary" />
      <div className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 border-x-8 border-t-8 border-x-transparent border-t-primary" />
      <div className="pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2 border-x-8 border-b-8 border-x-transparent border-b-primary" />
    </div>
  )
}
