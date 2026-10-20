import { motion } from 'motion/react'
import { ArrowLeft, Shuffle, Trash2, Vote } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Link, useParams } from 'react-router-dom'
import { SpotifyIcon, YtMusicIcon } from '@/components/Brand'
import { CoverZoom } from '@/components/CoverZoom'
import { Masthead, SoundToggle, Footer } from '@/components/Guide'
import { Button, buttonVariants } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useGroup } from '@/hooks/useGroup'
import { api } from '@/lib/api'
import { spotifySearch, ytmusicSearch } from '@/lib/musicbrainz'
import type { GroupState } from '@/hooks/useGroup'
import { cn } from '@/lib/utils'

const when = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' })

export function Rounds({ data, refresh }: { data: GroupState; refresh?: () => void }) {
  const { group, history, rounds, userId } = data
  const isLeader = group.leader_id === userId
  const [asking, setAsking] = useState<string | null>(null) // item esperando confirmação de exclusão
  // a numeração é a posição da rodada na ordem de criação, a mesma do #N da tela do grupo
  const meta = new Map(rounds.map((r, i) => [r.id, { no: i + 1, kind: r.kind, mode: r.mode }]))
  const items = history.map((h) => ({ h, r: h.round_id ? meta.get(h.round_id) : undefined }))

  return (
    <main className="mx-auto max-w-4xl px-4 pb-14 pt-4 sm:pt-6">
      <Masthead>
        <SoundToggle />
      </Masthead>

      <header className="space-y-4 py-5 sm:py-6">
        <Link to={`/g/${group.id}`} className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold underline underline-offset-4">
          <ArrowLeft className="size-4" /> Voltar ao grupo
        </Link>
        <h1 className="break-words text-[clamp(2.25rem,9vw,3.75rem)]">Histórico</h1>
        <p className="tnum text-base font-medium">
          <span className="font-bold">{group.name}</span> · {rounds.length} {rounds.length === 1 ? 'rodada' : 'rodadas'} · {history.length} {history.length === 1 ? 'álbum ouvido' : 'álbuns ouvidos'}
        </p>
        <p className="text-sm text-muted-foreground">Os álbuns daqui nunca mais entram nos sorteios deste grupo.{isLeader && ' Excluir um item libera o álbum para voltar a ser sorteado.'}</p>
      </header>

      {items.length === 0 ? (
        <p className="box px-4 py-6 text-sm text-muted-foreground">Nenhuma rodada concluída ainda. Quando o grupo confirmar o primeiro álbum, ele aparece aqui com o número da rodada.</p>
      ) : (
        <ol className="box divide-y divide-foreground/20 overflow-hidden">
          {items.map(({ h, r }, i) => (
            <motion.li
              key={h.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: Math.min(i, 8) * 0.05, ease: [0.22, 1, 0.36, 1] }}
              className="grid grid-cols-[3.25rem_5rem_minmax(0,1fr)] items-start gap-x-3 p-3 sm:grid-cols-[4rem_7rem_minmax(0,1fr)] sm:gap-x-4 sm:p-4"
            >
              <span className="tnum pt-1 text-3xl font-extrabold leading-none sm:text-4xl" style={{ fontStretch: '62%' }}>{r ? `#${r.no}` : '–'}</span>
              <CoverZoom album={h.album} size={250} className="w-full" />
              <div className="min-w-0 space-y-1">
                <h2 className="text-xl leading-none sm:text-2xl">{h.album.title}</h2>
                <p className="text-sm font-semibold">{h.album.artist}{h.album.year ? ` · ${h.album.year}` : ''}</p>
                <p className="tnum flex items-start gap-1.5 text-xs text-muted-foreground">
                  {r && (r.kind === 'vote' ? <Vote className="mt-px size-3.5 shrink-0" aria-hidden /> : <Shuffle className="mt-px size-3.5 shrink-0" aria-hidden />)}
                  <span>
                    {r ? `${r.kind === 'vote' ? 'Votação' : 'Sorteio'} · ${r.mode === 'artist' ? 'Bandas/artistas' : r.mode === 'album' ? 'Álbuns' : 'Gêneros'} · ` : ''}
                    {when(h.confirmed_at)}
                  </span>
                </p>
                <div className="grid grid-cols-[repeat(auto-fit,minmax(9.5rem,1fr))] gap-2 pt-2">
                  <a href={spotifySearch(h.album)} target="_blank" rel="noreferrer" className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'w-full')}>
                    <SpotifyIcon className="size-4" /> Spotify
                  </a>
                  <a href={ytmusicSearch(h.album)} target="_blank" rel="noreferrer" className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'w-full')}>
                    <YtMusicIcon className="size-4" /> YouTube Music
                  </a>
                  {isLeader &&
                    (asking === h.id ? (
                      <>
                        <Button variant="destructive" size="sm" onClick={() => api.deleteHistoryItem(h.id).then(() => { setAsking(null); refresh?.() }, (e: Error) => toast.error(e.message))}><Trash2 /> Excluir mesmo</Button>
                        <Button variant="outline" size="sm" onClick={() => setAsking(null)}>Cancelar</Button>
                      </>
                    ) : (
                      <Button variant="outline" size="sm" className="w-full" onClick={() => setAsking(h.id)}><Trash2 /> Excluir do histórico</Button>
                    ))}
                </div>
              </div>
            </motion.li>
          ))}
        </ol>
      )}
      <Footer />
    </main>
  )
}

export default function GroupHistoryPage() {
  const { id = '' } = useParams()
  const { state, refresh } = useGroup(id)
  if (state.status === 'loading') return <Skeleton className="mx-auto mt-24 h-64 max-w-md" />
  if (state.status === 'error') return <p className="mt-24 text-center text-destructive">{state.message}</p>
  if (state.status === 'outsider') {
    return (
      <p className="mt-24 text-center">
        Você ainda não faz parte deste grupo. <Link to={`/g/${id}`} className="font-semibold underline underline-offset-4">Entrar no grupo</Link>
      </p>
    )
  }
  return <Rounds data={state.data} refresh={refresh} />
}
