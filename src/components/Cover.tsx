import { useState } from 'react'
import { coverUrl } from '@/lib/musicbrainz'
import { cn } from '@/lib/utils'
import type { Album } from '@/lib/types'

const hue = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7)

/** Capa do Cover Art Archive; sem capa mostra um bloco colorido com o título. */
export function Cover({ album, size = 500, className }: { album: Pick<Album, 'id' | 'title'>; size?: 250 | 500; className?: string }) {
  const [failed, setFailed] = useState(false)
  return (
    <div
      className={cn('relative aspect-square overflow-hidden bg-muted', className)}
      style={failed ? { background: `linear-gradient(135deg, oklch(0.45 0.15 ${hue(album.id)}), oklch(0.25 0.08 ${hue(album.id) + 60}))` } : undefined}
    >
      {failed ? (
        <span className="absolute inset-0 flex items-center justify-center p-2 text-center text-xs font-semibold text-white/80">{album.title}</span>
      ) : (
        <img src={coverUrl(album.id, size)} alt={album.title} loading="lazy" draggable={false} onError={() => setFailed(true)} className="size-full object-cover" />
      )}
    </div>
  )
}
