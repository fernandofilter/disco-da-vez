import { motion } from 'motion/react'
import { ExternalLink, Music2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { albumDetails, spotifySearch, ytmusicSearch } from '@/lib/musicbrainz'
import type { Album, AlbumDetails } from '@/lib/types'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Card } from './ui/card'
import { Skeleton } from './ui/skeleton'
import { Cover } from './Cover'

const mmss = (ms: number | null) => (ms ? `${Math.floor(ms / 60000)}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, '0')}` : '–')
const total = (ms: number) => `${Math.round(ms / 60000)} min`

export function AlbumCard({ album }: { album: Album }) {
  const [d, setD] = useState<AlbumDetails | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setD(null)
    setFailed(false)
    albumDetails(album.id).then(setD, () => setFailed(true))
  }, [album.id])

  return (
    <motion.div initial={{ opacity: 0, y: 24, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: 'spring', stiffness: 160, damping: 18 }}>
      <Card className="grid gap-5 p-4 sm:grid-cols-[minmax(0,260px)_1fr] sm:p-5">
        <Cover album={album} className="w-full rounded-xl shadow-2xl shadow-primary/20" />
        <div className="flex min-w-0 flex-col gap-3">
          <div>
            <h2 className="text-2xl font-bold leading-tight sm:text-3xl">{album.title}</h2>
            <p className="text-lg text-muted-foreground">{album.artist}</p>
            <p className="text-sm text-muted-foreground">
              {[album.year, d?.tracks.length ? `${d.tracks.length} faixas` : null, d?.totalMs ? total(d.totalMs) : null, d?.label].filter(Boolean).join(' · ')}
            </p>
          </div>
          {d ? (
            d.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {d.tags.map((t) => (
                  <Badge key={t} variant="secondary">{t}</Badge>
                ))}
              </div>
            )
          ) : (
            !failed && <Skeleton className="h-5 w-48" />
          )}
          <div className="flex flex-wrap gap-2">
            <Button nativeButton={false} render={<a href={d?.links.spotify ?? spotifySearch(album)} target="_blank" rel="noreferrer" />}>
              <Music2 /> Ouvir no Spotify <ExternalLink className="opacity-60" />
            </Button>
            <Button variant="secondary" nativeButton={false} render={<a href={d?.links.ytmusic ?? ytmusicSearch(album)} target="_blank" rel="noreferrer" />}>
              <Music2 /> YouTube Music <ExternalLink className="opacity-60" />
            </Button>
          </div>
          {d ? (
            d.tracks.length > 0 && (
              <details className="group rounded-lg border bg-background/40">
                <summary className="cursor-pointer select-none px-3 py-2 text-sm font-medium">Faixas ({d.tracks.length})</summary>
                <ol className="max-h-64 divide-y overflow-y-auto border-t text-sm">
                  {d.tracks.map((t) => (
                    <li key={t.n} className="flex gap-3 px-3 py-1.5">
                      <span className="w-6 shrink-0 text-right tabular-nums text-muted-foreground">{t.n}</span>
                      <span className="min-w-0 flex-1 truncate">{t.title}</span>
                      <span className="tabular-nums text-muted-foreground">{mmss(t.ms)}</span>
                    </li>
                  ))}
                </ol>
              </details>
            )
          ) : failed ? (
            <p className="text-sm text-muted-foreground">Não consegui carregar as faixas agora (MusicBrainz ocupado).</p>
          ) : (
            <Skeleton className="h-10 w-full" />
          )}
        </div>
      </Card>
    </motion.div>
  )
}
