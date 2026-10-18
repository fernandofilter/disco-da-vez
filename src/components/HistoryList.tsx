import { motion } from 'motion/react'
import type { HistoryItem } from '@/lib/types'
import { Cover } from './Cover'

export function HistoryList({ items }: { items: HistoryItem[] }) {
  if (!items.length) return <p className="text-sm text-muted-foreground">Os álbuns que o grupo confirmar para ouvir aparecem aqui e nunca mais são sorteados.</p>
  return (
    <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
      {items.map((h, i) => (
        <motion.li key={h.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: Math.min(i, 8) * 0.04 }} title={`${h.album.title} — ${h.album.artist}`}>
          <Cover album={h.album} size={250} className="w-full rounded-lg" />
          <p className="mt-1 truncate text-xs font-medium">{h.album.title}</p>
          <p className="truncate text-xs text-muted-foreground">{h.album.artist}</p>
        </motion.li>
      ))}
    </ul>
  )
}
