import { AnimatePresence, motion } from 'motion/react'
import { Check, Loader2, Mic, Pencil, Tags, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import genres from '@/data/genres.json'
import { api } from '@/lib/api'
import { artistAlbums, searchArtists } from '@/lib/musicbrainz'
import { sfx } from '@/lib/sound'
import type { Choice, Mode } from '@/lib/types'
import { Button } from './ui/button'
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from './ui/command'

const MAX = 5

interface Props {
  roundId: string
  mode: Mode
  initial: Choice[]
  ready: boolean
}

/** Até 5 artistas (busca no MusicBrainz) ou gêneros (lista oficial do MusicBrainz). Salva a cada mudança. */
export function ChoicePicker({ roundId, mode, initial, ready }: Props) {
  const [items, setItems] = useState<Choice[]>(initial)
  const [query, setQuery] = useState('')
  const [found, setFound] = useState<Choice[]>([])
  const [searching, setSearching] = useState(false)
  const [checking, setChecking] = useState<string | null>(null)
  const [locked, setLocked] = useState(ready)

  // o servidor é a fonte da verdade quando a rodada muda ou o líder volta para as escolhas
  useEffect(() => {
    setItems(initial)
    setLocked(ready)
  }, [roundId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (mode !== 'artist' || query.trim().length < 2) return setFound([])
    setSearching(true)
    const t = setTimeout(() => {
      searchArtists(query).then(setFound, () => setFound([])).finally(() => setSearching(false))
    }, 450)
    return () => clearTimeout(t)
  }, [query, mode])

  const genreMatches = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return (genres as string[]).filter((g) => g.includes(q)).slice(0, 8).map((g) => ({ id: g, name: g }))
  }, [query])

  const options = (mode === 'artist' ? found : (genreMatches as Choice[])).filter((o) => !items.some((i) => i.id === o.id))

  const save = (next: Choice[], isReady: boolean) => {
    setItems(next)
    api.setChoices(roundId, next, isReady).catch((e: Error) => {
      sfx.error()
      toast.error(e.message)
    })
  }

  async function add(c: Choice) {
    if (items.length >= MAX) return toast.info(`Máximo de ${MAX} escolhas.`)
    if (mode === 'artist') {
      setChecking(c.id)
      try {
        // já aquece o cache usado no sorteio; artista só com EP/single não serve
        if (!(await artistAlbums(c)).length) return toast.error(`${c.name} não tem álbuns completos (só EPs/singles).`)
      } catch {
        return toast.error('Não consegui consultar o MusicBrainz agora. Tente de novo.')
      } finally {
        setChecking(null)
      }
    }
    setQuery('')
    save([...items, c], false)
  }

  return (
    <div className="space-y-4">
      <div className="flex min-h-11 flex-wrap gap-2">
        <AnimatePresence initial={false}>
          {items.map((c) => (
            <motion.div key={c.id} layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}>
              <span className="flex h-11 items-center gap-1 rounded-sm border-[1.5px] border-foreground bg-foreground pl-3 text-base font-bold text-background">
                {mode === 'artist' ? <Mic className="mr-1 size-4 shrink-0" aria-hidden /> : <Tags className="mr-1 size-4 shrink-0" aria-hidden />}
                {c.name}
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
        {items.length === 0 && <p className="self-center text-sm text-muted-foreground">Escolha de 1 a {MAX} {mode === 'artist' ? 'bandas/artistas' : 'gêneros'}.</p>}
      </div>

      {locked ? (
        <Button variant="outline" onClick={() => { setLocked(false); save(items, false) }}>
          <Pencil /> Editar escolhas
        </Button>
      ) : (
        <>
          <Command shouldFilter={false}>
            <CommandInput value={query} onValueChange={setQuery} placeholder={mode === 'artist' ? 'Buscar banda ou artista…' : 'Buscar gênero (ex.: post-rock, shoegaze)…'} disabled={items.length >= MAX} />
            {(query.trim().length >= 2 || options.length > 0) && (
              <CommandList>
                {searching || checking ? (
                  <div className="flex items-center gap-2 p-3 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> {checking ? 'Conferindo discografia…' : 'Buscando…'}</div>
                ) : (
                  <CommandEmpty>Nada encontrado.</CommandEmpty>
                )}
                {options.map((o) => (
                  <CommandItem key={o.id} value={o.id} onSelect={() => add(o)}>
                    <span className="max-w-[60%] shrink-0 truncate">{o.name}</span>
                    {o.sub && <span className="ml-2 min-w-0 truncate text-xs opacity-70">{o.sub}</span>}
                  </CommandItem>
                ))}
              </CommandList>
            )}
          </Command>
          <Button size="lg" disabled={items.length === 0 || !!checking} onClick={() => { setLocked(true); save(items, true); sfx.ready() }}>
            <Check /> Confirmar escolhas ({items.length}/{MAX})
          </Button>
        </>
      )}
    </div>
  )
}
