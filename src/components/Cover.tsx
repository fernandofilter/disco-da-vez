import { useState } from 'react'
import { coverUrl } from '@/lib/musicbrainz'
import { cn } from '@/lib/utils'
import type { Album } from '@/lib/types'

/** Capa do Cover Art Archive; sem capa mostra uma hachura neutra com o título em caixa alta, sobre hachura neutra (cor é só das pessoas). */
export function Cover({ album, size = 500, className }: { album: Pick<Album, 'id' | 'title'>; size?: 250 | 500; className?: string }) {
  const [failed, setFailed] = useState(false)
  return (
    <div className={cn('relative aspect-square overflow-hidden bg-muted ring-1 ring-foreground/25 [container-type:inline-size]', className)}>
      {failed ? (
        <div className="absolute inset-0 flex items-end bg-card p-2 text-foreground [background-image:repeating-linear-gradient(45deg,oklch(0.17_0.012_262/0.14)_0_1.5px,transparent_1.5px_6px)]">
          <span className="display text-[clamp(0.9rem,5cqw,1.5rem)] leading-[0.95] [overflow-wrap:anywhere]">{album.title}</span>
        </div>
      ) : (
        <img src={coverUrl(album.id, size)} alt={album.title} loading="lazy" draggable={false} onError={() => setFailed(true)} className="size-full object-cover" />
      )}
    </div>
  )
}
