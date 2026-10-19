import { motion } from 'motion/react'
import { ExternalLink } from 'lucide-react'
import { useEffect, useState } from 'react'
import { albumDetails, spotifySearch, ytmusicSearch } from '@/lib/musicbrainz'
import type { Album, AlbumDetails } from '@/lib/types'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Skeleton } from './ui/skeleton'
import { SpotifyIcon, YtMusicIcon } from './Brand'
import { Cover } from './Cover'

const mmss = (ms: number | null) => (ms ? `${Math.floor(ms / 60000)}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, '0')}` : '–')
const total = (ms: number) => `${Math.round(ms / 60000)} min`

/** O programa do horário nobre: capa, título em caixa alta e a lista de faixas como encarte, com os tempos à direita. */
export function AlbumCard({ album }: { album: Album }) {
  const [d, setD] = useState<AlbumDetails | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setD(null)
    setFailed(false)
    albumDetails(album.id).then(setD, () => setFailed(true))
  }, [album.id])

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}>
      <div className="box grid gap-5 rounded-none border-t-[6px] p-4 sm:grid-cols-[minmax(0,260px)_1fr] sm:p-5">
        <Cover album={album} className="w-full max-w-72 sm:max-w-none" />
        <div className="flex min-w-0 flex-col gap-3">
          <div>
            <h2 className="text-5xl sm:text-6xl">{album.title}</h2>
            <p className="mt-2 text-xl font-semibold">{album.artist}</p>
            <p className="tnum text-sm text-muted-foreground">
              {[album.year, d?.tracks.length ? `${d.tracks.length} faixas` : null, d?.totalMs ? total(d.totalMs) : null, d?.label].filter(Boolean).join(' · ')}
            </p>
          </div>
          {d ? (
            d.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {d.tags.map((t) => (
                  <Badge key={t} variant="outline">{t}</Badge>
                ))}
              </div>
            )
          ) : (
            !failed && <Skeleton className="h-7 w-48" />
          )}
          <div className="flex flex-wrap gap-2">
            <Button size="lg" nativeButton={false} render={<a href={d?.links.spotify ?? spotifySearch(album)} target="_blank" rel="noreferrer" />}>
              <SpotifyIcon /> Ouvir no Spotify <ExternalLink className="opacity-70" />
            </Button>
            <Button size="lg" variant="outline" nativeButton={false} render={<a href={d?.links.ytmusic ?? ytmusicSearch(album)} target="_blank" rel="noreferrer" />}>
              <YtMusicIcon /> YouTube Music <ExternalLink className="opacity-70" />
            </Button>
          </div>
          {d ? (
            d.tracks.length > 0 && (
              <details open className="group border-[1.5px] border-foreground">
                <summary className="flex min-h-11 cursor-pointer select-none items-center px-3 text-sm font-bold uppercase tracking-wide">Faixas ({d.tracks.length})</summary>
                <ol className="max-h-72 overflow-y-auto border-t-[1.5px] border-foreground text-sm">
                  {d.tracks.map((t) => (
                    <li key={t.n} className="grid grid-cols-[2rem_1fr_auto] items-baseline gap-3 border-b border-foreground/20 px-3 py-2 last:border-b-0">
                      <span className="tnum text-right text-muted-foreground">{t.n}</span>
                      <span className="min-w-0 truncate">{t.title}</span>
                      <span className="tnum text-muted-foreground">{mmss(t.ms)}</span>
                    </li>
                  ))}
                </ol>
              </details>
            )
          ) : failed ? (
            <p className="text-sm text-muted-foreground">Não consegui carregar as faixas agora (MusicBrainz ocupado).</p>
          ) : (
            <Skeleton className="h-11 w-full" />
          )}
        </div>
      </div>
    </motion.div>
  )
}
