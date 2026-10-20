import { ArrowLeft, CircleCheck, Loader2, Mic, Pencil, RotateCcw, Shuffle, Tags, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { AlbumIcon } from '@/components/Brand'
import { ChoicePicker } from '@/components/ChoicePicker'
import { CoverZoom } from '@/components/CoverZoom'
import { Reveal } from '@/components/GroupView'
import { Masthead, Segmented, SoundToggle, Footer } from '@/components/Guide'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { drawAlbums } from '@/lib/albums'
import { sfx } from '@/lib/sound'
import type { Album, Choice, Member, Mode } from '@/lib/types'

// Jogar sozinho não usa conta nem grupo: escolhas e histórico ficam só neste aparelho.
const KEY = 'album-sort:solo'
interface Store {
  mode: Mode
  choices: Partial<Record<Mode, Choice[]>>
  history: { id: string; album: Album; at: string }[]
}
const load = (): Store => {
  try {
    return { mode: 'artist', choices: {}, history: [], ...JSON.parse(localStorage.getItem(KEY) ?? '{}') }
  } catch {
    return { mode: 'artist', choices: {}, history: [] }
  }
}
const save = (s: Store) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(s))
  } catch {
    /* storage bloqueado: só perde a lembrança entre visitas */
  }
}

const ME = { id: 'me', lastfm_user: null } as Member

export default function Solo() {
  const [store, setStore] = useState(load)
  const [step, setStep] = useState<'choose' | 'draw'>('choose') // duas telas: escolhas e sorteio
  const [spin, setSpin] = useState(0) // cada sorteio soma 1 e reinicia a fita
  const [drawn, setDrawn] = useState<{ album: Album; filler: Album[]; saved: boolean } | null>(null)
  const [busy, setBusy] = useState(false)
  const [asking, setAsking] = useState<string | null>(null)
  const { mode, history } = store
  const items = store.choices[mode] ?? []

  const update = (next: Store) => {
    setStore(next)
    save(next)
  }

  async function draw() {
    setBusy(true)
    setDrawn(null)
    setStep('draw')
    setSpin((n) => n + 1)
    window.scrollTo({ top: 0 })
    try {
      const { albums, filler } = await drawAlbums({ mode, members: [ME], choices: { me: items }, historyIds: history.map((h) => h.album.id), count: 1 })
      if (!albums[0]) {
        sfx.error()
        setStep('choose')
        return toast.error('Não achei álbuns com essas escolhas (histórico ou sem capa). Troque algumas escolhas.')
      }
      setDrawn({ album: albums[0], filler, saved: false })
    } catch (e) {
      sfx.error()
      setStep('choose')
      toast.error(e instanceof Error ? e.message : 'Não consegui sortear agora')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-4 pb-14 pt-4 sm:pt-6">
      <Masthead>
        <SoundToggle />
      </Masthead>

      <header className="space-y-4 py-5 sm:py-6">
        {step === 'choose' ? (
          <Link to="/" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold underline underline-offset-4">
            <ArrowLeft className="size-4" /> Voltar
          </Link>
        ) : (
          <button type="button" disabled={busy} onClick={() => setStep('choose')} className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold underline underline-offset-4 disabled:opacity-45">
            <ArrowLeft className="size-4" /> Voltar às escolhas
          </button>
        )}
        <h1 className="break-words text-[clamp(2.25rem,9vw,3.75rem)]">{step === 'choose' ? 'Jogar sozinho' : 'Sorteio'}</h1>
        {step === 'choose' && <p className="text-sm text-muted-foreground">Sem conta e sem grupo: suas escolhas e o histórico ficam só neste aparelho.</p>}
      </header>

      {step === 'choose' ? (
        <div className="space-y-8">
          <section className="space-y-3 border-t-[3px] border-foreground pt-3">
            <h2 className="text-3xl">Escolhas</h2>
            <Card className="gap-5 p-4 sm:p-5">
              <Segmented
                label="Escolher por"
                value={mode}
                onChange={(m) => update({ ...store, mode: m })}
                options={[{ v: 'artist', label: 'Bandas/artistas', icon: <Mic className="size-4" /> }, { v: 'genre', label: 'Gêneros', icon: <Tags className="size-4" /> }, { v: 'album', label: 'Álbuns', icon: <AlbumIcon className="size-4" /> }]}
              />
              <ChoicePicker roundId={mode} mode={mode} initial={items} ready={items.length > 0} onChange={(next) => update({ ...store, choices: { ...store.choices, [mode]: next } })} />
            </Card>
            <Button size="lg" disabled={items.length === 0 || busy} onClick={draw}>
              <Shuffle /> Sortear álbum
            </Button>
          </section>

          {history.length > 0 && (
            <section className="space-y-3 border-t-[3px] border-foreground pt-3">
              <h2 className="text-3xl">Histórico</h2>
              <p className="text-sm text-muted-foreground">Álbuns daqui não entram mais nos seus sorteios. Excluir um item libera o álbum de novo.</p>
              <ul className="box divide-y divide-foreground/20 overflow-hidden">
                {history.map((h) => (
                  <li key={h.id} className="grid grid-cols-[4rem_minmax(0,1fr)] items-start gap-x-3 p-3">
                    <CoverZoom album={h.album} size={250} className="w-full" />
                    <div className="min-w-0 space-y-1">
                      <p className="truncate text-lg font-bold leading-tight">{h.album.title}</p>
                      <p className="truncate text-sm">{h.album.artist}{h.album.year ? ` · ${h.album.year}` : ''}</p>
                      <div className="flex flex-wrap gap-2 pt-1">
                        {asking === h.id ? (
                          <>
                            <Button variant="destructive" size="sm" onClick={() => { update({ ...store, history: history.filter((x) => x.id !== h.id) }); setAsking(null) }}><Trash2 /> Excluir mesmo</Button>
                            <Button variant="outline" size="sm" onClick={() => setAsking(null)}>Cancelar</Button>
                          </>
                        ) : (
                          <Button variant="outline" size="sm" onClick={() => setAsking(h.id)}><Trash2 /> Excluir</Button>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      ) : (
        <section className="space-y-3">
          <Reveal round={{ id: 'solo', spin, result_at: null }} album={drawn?.album} pool={drawn?.filler ?? []} hint="Buscando nas suas escolhas">
            {(rolled) =>
              rolled && drawn ? (
                <div className="grid grid-cols-[repeat(auto-fit,minmax(13.5rem,1fr))] gap-3">
                  <Button size="lg" className="w-full" disabled={drawn.saved} onClick={() => { update({ ...store, history: [{ id: crypto.randomUUID(), album: drawn.album, at: new Date().toISOString() }, ...history] }); setDrawn({ ...drawn, saved: true }) }}>
                    <CircleCheck /> {drawn.saved ? 'Salvo no histórico' : 'Vou ouvir esse'}
                  </Button>
                  <Button variant="outline" size="lg" className="w-full" disabled={busy} onClick={draw}>
                    {busy ? <Loader2 className="animate-spin" /> : <RotateCcw />} {drawn.saved ? 'Sortear outro' : 'Sortear de novo'}
                  </Button>
                  <Button variant="outline" size="lg" className="w-full" onClick={() => setStep('choose')}>
                    <Pencil /> Mudar as escolhas
                  </Button>
                </div>
              ) : null
            }
          </Reveal>
        </section>
      )}
      <Footer />
    </main>
  )
}
