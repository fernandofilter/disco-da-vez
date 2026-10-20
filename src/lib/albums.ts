import { pickAlbums, shuffle, type Candidate } from './draw'
import { lastfmEnabled, topAlbumsByTag } from './lastfm'
import { artistAlbums, choiceToAlbum, genreAlbums, hasCover, resolveAlbum } from './musicbrainz'
import type { Album, Choice, DrawResult, Member, Mode } from './types'

const own = (a: Album): Candidate => ({ key: a.id, album: a, resolve: async () => a })

/** Genre: metade das vezes MusicBrainz por tag, metade Last.fm (se houver chave); se uma falhar usa a outra. */
async function genrePool(genre: string): Promise<Candidate[]> {
  const sources: (() => Promise<Candidate[]>)[] = [
    async () => (await genreAlbums(genre)).map(own),
    async () =>
      (await topAlbumsByTag(genre)).map((x) => ({
        key: `lfm:${x.artist}|${x.title}`,
        resolve: () => resolveAlbum(x.artist, x.title),
      })),
  ]
  const order = lastfmEnabled ? shuffle(sources) : [sources[0]]
  for (const s of order) {
    try {
      const pool = await s()
      if (pool.length) return pool
    } catch {
      /* tenta a próxima fonte */
    }
  }
  return []
}

/** Pool de candidatos de uma escolha; artista fica em cache, gênero sorteia uma página nova a cada chamada. */
export function poolFor(mode: Mode) {
  return async (choice: Choice): Promise<Candidate[]> =>
    mode === 'album' ? [own(choiceToAlbum(choice))] : mode === 'artist' ? (await artistAlbums(choice)).map(own) : genrePool(choice.name)
}

/** Só exige que o álbum tenha capa; o resto é sorteio puro (nada de "já escutou"). */
const hasFront = (album: Album) => hasCover(album.id)

const FILLER_CHOICES = 8 // quantas escolhas (no máximo) contribuem com capas para a fita
const FILLER_BUDGET_MS = 3000 // a fita não vale mais espera que isso: usa as capas que deu tempo de juntar
const FILLER_PER_CHOICE = 14 // quanto mais capas diferentes na fita, menos óbvio quem vence
const FILLER_TOTAL = 60

export async function drawAlbums(opts: {
  mode: Mode
  members: Member[]
  choices: Record<string, Choice[]>
  historyIds: string[]
  count: number
  onProgress?: (done: number, total: number) => void
}): Promise<{ albums: Album[]; filler: Album[] }> {
  const byChoice = new Map<string, Album[]>()
  const pool = poolFor(opts.mode)
  const remember = (c: Choice, list: Candidate[]) => byChoice.set(c.id, list.flatMap((x) => x.album ?? []))
  const withChoices = opts.members.map((m) => ({ id: m.id, choices: opts.choices[m.id] ?? [] })).filter((m) => m.choices.length)
  const { albums } = await pickAlbums(
    {
      members: withChoices,
      pool: async (c) => {
        const list = await pool(c)
        remember(c, list)
        return list
      },
      accept: hasFront,
      exclude: new Set(opts.historyIds),
      onProgress: opts.onProgress,
    },
    opts.count,
  )

  // a fita mostra capas de todo mundo, não só do pool que o sorteio abriu primeiro: completa com uma amostra das outras escolhas
  const turns = withChoices.map((m) => shuffle(m.choices))
  const rest = Array.from({ length: Math.max(0, ...turns.map((t) => t.length)) }, (_, i) => turns.flatMap((t) => t[i] ?? [])).flat()
  let over = false
  const gather = async () => {
    for (const c of rest) {
      if (over || byChoice.size >= FILLER_CHOICES) return
      if (!byChoice.has(c.id)) await pool(c).then((l) => remember(c, l), () => {})
    }
  }
  await Promise.race([gather(), new Promise((r) => setTimeout(r, FILLER_BUDGET_MS))])
  over = true // o que ainda estiver na fila do MusicBrainz não atrasa mais nada
  const picked = new Set(albums.map((a) => a.id))
  const sample = shuffle([...byChoice.values()].flatMap((l) => shuffle(l.filter((a) => !picked.has(a.id))).slice(0, FILLER_PER_CHOICE)))
  const tryOut = sample.slice(0, FILLER_TOTAL + 20) // folga para as que não têm capa
  const covered = await Promise.all(tryOut.map((a) => hasCover(a.id)))
  return { albums, filler: tryOut.filter((_, i) => covered[i]).slice(0, FILLER_TOTAL) }
}

export const toResult = (album: Album, filler: Album[]): DrawResult => ({ album, filler })
