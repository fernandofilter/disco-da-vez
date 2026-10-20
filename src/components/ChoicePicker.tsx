import { AnimatePresence, motion } from 'motion/react'
import { Check, Loader2, Mic, Pencil, Tags, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import genres from '@/data/genres.json'
import { api } from '@/lib/api'
import { artistAlbums, hasCover, searchAlbums, searchArtists } from '@/lib/musicbrainz'
import { sfx } from '@/lib/sound'
import type { Choice, Mode } from '@/lib/types'
import { AlbumIcon } from './Brand'
import { Cover } from './Cover'
import { Button } from './ui/button'
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from './ui/command'

const MAX = 5

const COPY: Record<Mode, { many: string; search: string; icon: React.ComponentType<{ className?: string }> }> = {
  artist: { many: 'bandas/artistas', search: 'Buscar banda ou artista…', icon: Mic },
  genre: { many: 'gêneros', search: 'Buscar gênero (ex.: post-rock, shoegaze)…', icon: Tags },
  album: { many: 'álbuns', search: 'Buscar álbum ou artista…', icon: AlbumIcon },
}

interface Props {
  roundId: string
  mode: Mode
  initial: Choice[]
  ready: boolean
  /** Mínimo de escolhas para confirmar (padrão 1). */
  min?: number
  /** Sem isso salva no servidor (rodada do grupo); o modo solo guarda no próprio aparelho. */
  onChange?: (items: Choice[], ready: boolean) => void
}

/** Até 5 artistas (busca no MusicBrainz) ou gêneros (lista oficial do MusicBrainz). Salva a cada mudança. */
export function ChoicePicker({ roundId, mode, initial, ready, min = 1, onChange }: Props) {
  const [items, setItems] = useState<Choice[]>(initial)
  const [query, setQuery] = useState('')
  const [found, setFound] = useState<Choice[]>([])
  const [searching, setSearching] = useState(false)
  const [locked, setLocked] = useState(ready)
  const itemsRef = useRef(items)
  itemsRef.current = items
  const copy = COPY[mode]
  const Icon = copy.icon

  // o servidor é a fonte da verdade quando a rodada muda ou o líder volta para as escolhas
  useEffect(() => {
    setItems(initial)
    setLocked(ready)
  }, [roundId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (mode === 'genre' || query.trim().length < 2) return setFound([])
    setSearching(true)
    const t = setTimeout(() => {
      ;(mode === 'artist' ? searchArtists : searchAlbums)(query).then(setFound, () => setFound([])).finally(() => setSearching(false))
    }, 450)
    return () => clearTimeout(t)
  }, [query, mode])

  const genreMatches = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return (genres as string[]).filter((g) => g.includes(q)).slice(0, 8).map((g) => ({ id: g, name: g }))
  }, [query])

  const options = (mode === 'genre' ? (genreMatches as Choice[]) : found).filter((o) => !items.some((i) => i.id === o.id))

  const save = (next: Choice[], isReady: boolean) => {
    setItems(next)
    if (onChange) return onChange(next, isReady)
    api.setChoices(roundId, next, isReady).catch((e: Error) => {
      sfx.error()
      toast.error(e.message)
    })
  }

  /** Entra na hora; a conferência (artista só com EP/single, álbum sem capa) roda em segundo plano e, se reprovar, tira a escolha. */
  function add(c: Choice) {
    if (items.length >= MAX) return toast.info(`Máximo de ${MAX} escolhas.`)
    setQuery('')
    save([...items, c], false)
    if (mode === 'genre') return
    const ok =
      mode === 'artist'
        ? artistAlbums(c).then((l) => l.length > 0 || `${c.name} não tem álbuns de estúdio (só EPs, singles, ao vivo ou coletâneas).`)
        : hasCover(c.id).then((has) => has || `${c.name} não tem capa disponível. Escolha outro álbum.`)
    ok.then(
      (res) => {
        if (res === true) return
        toast.error(res)
        setLocked(false)
        save(itemsRef.current.filter((i) => i.id !== c.id), false)
      },
      () => {}, // MusicBrainz fora do ar: mantém a escolha, o sorteio já pula pools que falham
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex min-h-11 flex-wrap gap-2">
        <AnimatePresence initial={false}>
          {items.map((c) => (
            <motion.div key={c.id} layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}>
              <span className="flex h-11 items-center gap-1 rounded-sm border-[1.5px] border-foreground bg-foreground pl-3 text-base font-bold text-background">
                <Icon className="mr-1 size-4 shrink-0" aria-hidden />
                {c.name}{mode === 'album' && c.sub && <span className="ml-1 max-w-40 truncate text-sm font-medium opacity-70">· {c.sub}</span>}
                {!locked && (
                  <button aria-label={`Remover ${c.name}`} className="flex size-11 items-center justify-center hover:bg-background/15" onClick={() => save(items.filter((i) => i.id !== c.id), false)}>
                    <X className="size-4" />
                  </button>
                )}
                {locked && <span className="w-3" />}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
        {items.length === 0 && <p className="self-center text-sm text-muted-foreground">Escolha de {min} a {MAX} {copy.many}.</p>}
      </div>

      {locked ? (
        <Button variant="outline" onClick={() => { setLocked(false); save(items, false) }}>
          <Pencil /> Editar escolhas
        </Button>
      ) : (
        <>
          <Command shouldFilter={false}>
            <CommandInput value={query} onValueChange={setQuery} placeholder={copy.search} disabled={items.length >= MAX} />
            {(query.trim().length >= 2 || options.length > 0) && (
              <CommandList>
                {searching ? (
                  <div className="flex items-center gap-2 p-3 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Buscando…</div>
                ) : (
                  <CommandEmpty>Nada encontrado.</CommandEmpty>
                )}
                {options.map((o) => (
                  <CommandItem key={o.id} value={o.id} onSelect={() => add(o)}>
                    {mode === 'album' && <Cover album={{ id: o.id, title: o.name }} size={250} className="size-12 shrink-0" />}
                    <span className="max-w-[60%] shrink-0 truncate">{o.name}</span>
                    {o.sub && <span className="ml-2 min-w-0 truncate text-xs opacity-70">{o.sub}{o.year ? ` · ${o.year}` : ''}</span>}
                  </CommandItem>
                ))}
              </CommandList>
            )}
          </Command>
          <Button size="lg" disabled={items.length < min} onClick={() => { setLocked(true); save(items, true); sfx.ready() }}>
            <Check /> Confirmar escolhas ({items.length}/{MAX})
          </Button>
        </>
      )}
    </div>
  )
}
