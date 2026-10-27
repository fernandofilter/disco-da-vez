import { motion } from 'motion/react'
import { ExternalLink, Pause, Play } from 'lucide-react'
import { Fragment, useEffect, useRef, useState } from 'react'
import { useListenLinks } from '@/hooks/useListenLinks'
import { albumDetails, albumSides, trackKey } from '@/lib/musicbrainz'
import { previews } from '@/lib/preview'
import type { Album, AlbumDetails } from '@/lib/types'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { cn } from '@/lib/utils'
import { Skeleton } from './ui/skeleton'
import { SpotifyIcon, YtMusicIcon } from './Brand'
import { CoverZoom } from './CoverZoom'

const mmss = (ms: number | null) => (ms ? `${Math.floor(ms / 60000)}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, '0')}` : '–')
const total = (ms: number) => `${Math.round(ms / 60000)} min`

/** Uma linha da ficha técnica: rótulo em caixa alta à esquerda, valor em números tabulares à direita. */
function Spec({ label, value }: { label: string; value?: string | number | null }) {
  if (!value) return null
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-foreground/20 py-2 last:border-b-0">
      <dt className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="tnum min-w-0 truncate text-right font-bold">{value}</dd>
    </div>
  )
}

/**
 * O programa do horário nobre, montado como um encarte: a capa (inclina e abre em tela cheia) com a ficha técnica embaixo,
 * o título, os gêneros e os botões ao lado, e a lista de faixas em toda a largura, em duas colunas quando cabe.
 */
export function AlbumCard({ album }: { album: Album }) {
  const [d, setD] = useState<AlbumDetails | null>(null)
  const [failed, setFailed] = useState(false)
  const [clips, setClips] = useState<Record<number, string>>({}) // faixa → prévia de 30 s
  const [sides, setSides] = useState<Record<string, string>>({}) // nome da faixa → lado do vinil
  const [clipsChecked, setClipsChecked] = useState(false) // a busca das prévias terminou (com ou sem resultado)
  const [playing, setPlaying] = useState<number | null>(null)
  const audio = useRef<HTMLAudioElement>(null)
  const listen = useListenLinks(album, d?.links)

  useEffect(() => {
    setD(null)
    setFailed(false)
    setClips({})
    setSides({})
    setClipsChecked(false)
    albumSides(album.id).then(setSides, () => {})
    albumDetails(album.id).then(
      (details) => {
        setD(details)
        previews(album).then(
          (match) => setClips(match(details.tracks)),
          () => {},
        ).finally(() => setClipsChecked(true))
      },
      () => setFailed(true),
    )
    return () => audio.current?.pause()
  }, [album.id]) // eslint-disable-line react-hooks/exhaustive-deps -- o objeto muda a cada leitura em tempo real; o id não

  function toggle(n: number) {
    const a = audio.current
    if (!a) return
    if (playing === n) return a.pause()
    a.src = clips[n]
    a.play().then(() => setPlaying(n), () => setPlaying(null))
  }

  const label = d?.label && d.label !== '[no label]' ? d.label : null
  // lado de cada faixa, só quando a edição em vinil casa com a lista (faixa sem par herda o lado da anterior)
  const sideOf = (() => {
    if (!d) return null
    let prev: string | undefined
    let hits = 0
    const list = d.tracks.map((t) => {
      const s = sides[trackKey(t.title)]
      if (s) hits++
      return (prev = s ?? prev)
    })
    return hits >= d.tracks.length * 0.6 ? list : null
  })()

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}>
      <div className="box grid gap-x-8 gap-y-5 rounded-none border-t-[6px] p-4 sm:p-6 md:grid-cols-[17rem_minmax(0,1fr)]">
        <CoverZoom album={album} className="w-full max-w-72 md:col-start-1 md:row-start-1 md:max-w-none" />

        <div className="flex min-w-0 flex-col gap-4 md:col-start-2 md:row-span-2 md:row-start-1">
          <div>
            <h2 className="text-balance text-5xl [overflow-wrap:anywhere] sm:text-6xl">{album.title}</h2>
            <p className="mt-2 text-xl font-semibold">{album.artist}</p>
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
          <div className="flex flex-wrap gap-2 md:mt-auto">
            <Button size="lg" nativeButton={false} render={<a href={listen.spotify} target="_blank" rel="noreferrer" />}>
              <SpotifyIcon /> Ouvir no Spotify <ExternalLink className="opacity-70" />
            </Button>
            <Button size="lg" variant="outline" nativeButton={false} render={<a href={listen.ytmusic} target="_blank" rel="noreferrer" />}>
              <YtMusicIcon /> YouTube Music <ExternalLink className="opacity-70" />
            </Button>
          </div>
        </div>

        <dl className="border-y-[1.5px] border-foreground md:col-start-1 md:row-start-2" aria-label="Ficha técnica">
          <Spec label="Ano" value={album.year} />
          <Spec label="Faixas" value={d?.tracks.length} />
          <Spec label="Duração" value={d?.totalMs ? total(d.totalMs) : null} />
          <Spec label="Selo" value={label} />
          {!d && !failed && <Skeleton className="my-2 h-6 w-full" />}
        </dl>

        <div className="md:col-span-2">
          {d ? (
            d.tracks.length > 0 && (
              <>
                <div className="flex items-baseline justify-between border-y-[1.5px] border-foreground py-2 text-sm font-bold uppercase tracking-wide">
                  <h3 className="text-sm">Faixas</h3>
                  <span className="tnum text-muted-foreground">{d.tracks.length}{d.totalMs ? ` · ${total(d.totalMs)}` : ''}</span>
                </div>
                {clipsChecked && Object.keys(clips).length === 0 && (
                  <p className="border-b border-foreground/20 px-2 py-2 text-sm text-muted-foreground">Sem prévias para este álbum: ele não está em nosso catálogo.</p>
                )}
                <ol className="text-sm md:columns-2 md:gap-x-8">
                  {d.tracks.map((t, i) => {
                    const on = playing === t.n
                    const side = sideOf?.[i]
                    return (
                      <Fragment key={t.n}>
                        {side && side !== sideOf?.[i - 1] && (
                          <li aria-label={`Lado ${side}`} className="break-inside-avoid break-after-avoid border-b border-foreground/20 bg-muted px-2 py-1.5 text-xs font-bold uppercase tracking-wide">
                            Lado {side}
                          </li>
                        )}
                      <li className={cn('grid min-h-11 break-inside-avoid grid-cols-[1.75rem_2.25rem_1fr_auto] items-center gap-x-3 border-b border-foreground/20 px-2', on && 'bg-foreground text-background')}>
                        <span className={cn('tnum text-right', on ? 'text-background/75' : 'text-muted-foreground')}>{t.n}</span>
                        {clips[t.n] ? (
                          <button
                            type="button"
                            onClick={() => toggle(t.n)}
                            aria-pressed={on}
                            aria-label={`${on ? 'Pausar' : 'Ouvir prévia de'} ${t.title}`}
                            className={cn('grid size-9 place-items-center rounded border-[1.5px]', on ? 'border-background bg-background text-foreground' : 'border-foreground bg-card hover:bg-muted')}
                          >
                            {on ? <Pause className="size-4" /> : <Play className="size-4" />}
                          </button>
                        ) : (
                          <span />
                        )}
                        <span className="min-w-0 truncate">{t.title}</span>
                        <span className={cn('tnum', on ? 'text-background/75' : 'text-muted-foreground')}>{mmss(t.ms)}</span>
                      </li>
                      </Fragment>
                    )
                  })}
                </ol>
              </>
            )
          ) : failed ? (
            <p className="text-sm text-muted-foreground">Não consegui carregar as faixas agora (MusicBrainz ocupado).</p>
          ) : (
            <Skeleton className="h-11 w-full" />
          )}
          <audio ref={audio} onEnded={() => setPlaying(null)} onPause={() => setPlaying(null)} />
        </div>
      </div>
    </motion.div>
  )
}
