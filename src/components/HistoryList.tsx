import type { HistoryItem } from '@/lib/types'
import { Cover } from './Cover'

/** Reprises: o que o grupo já ouviu, em grade, nunca mais sorteado. */
export function HistoryList({ items }: { items: HistoryItem[] }) {
  if (!items.length) return <p className="box px-4 py-5 text-sm text-muted-foreground">Os álbuns que o grupo confirmar para ouvir aparecem aqui e nunca mais são sorteados.</p>
  return (
    <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
      {items.map((h) => (
        <li key={h.id} title={`${h.album.title} — ${h.album.artist}`} className="border-t-[3px] border-foreground pt-2">
          <Cover album={h.album} size={250} className="w-full" />
          <p className="mt-1.5 truncate text-xs font-bold">{h.album.title}</p>
          <p className="truncate text-xs text-muted-foreground">{h.album.artist}</p>
        </li>
      ))}
    </ul>
  )
}
