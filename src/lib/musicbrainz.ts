import { memo } from './cache'
import type { Album, AlbumDetails, Choice } from './types'

const BASE = 'https://musicbrainz.org/ws/2'
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

// MusicBrainz limita a ~1 req/s por IP: tudo passa por esta fila.
let lastCall = 0
let chain: Promise<unknown> = Promise.resolve()

function mb<T>(path: string, params: Record<string, string | number>): Promise<T> {
  const qs = new URLSearchParams({ fmt: 'json', ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])) })
  const run = async (): Promise<T> => {
    for (let attempt = 0; attempt < 4; attempt++) {
      const wait = lastCall + 1050 - Date.now()
      if (wait > 0) await sleep(wait)
      lastCall = Date.now()
      const r = await fetch(`${BASE}${path}?${qs}`, { headers: { Accept: 'application/json' } })
      if (r.ok) return r.json()
      if (r.status !== 503 && r.status !== 429) throw new Error(`MusicBrainz ${r.status}`)
      await sleep(2000 * (attempt + 1))
    }
    throw new Error('MusicBrainz está sobrecarregado, tente de novo em instantes')
  }
  const p = chain.then(run)
  chain = p.catch(() => {})
  return p
}

const lucene = (s: string) => s.replace(/[+\-&|!(){}[\]^"~*?:\\/]/g, ' ').trim()

export const coverUrl = (id: string, size: 250 | 500 | 1200 = 500) => `https://coverartarchive.org/release-group/${id}/front-${size}`

export interface RG {
  id: string
  title: string
  'first-release-date'?: string
  'secondary-types'?: string[]
  'artist-credit'?: { name: string }[]
}

const toAlbum = (rg: RG, artist?: string): Album => ({
  id: rg.id,
  title: rg.title,
  artist: artist ?? rg['artist-credit']?.map((c) => c.name).join(' & ') ?? '?',
  year: rg['first-release-date']?.slice(0, 4) || undefined,
})

// Gravações de shows datados ("1995-06-10: Cabaret Metro…") e itens sem data de lançamento são ruído, não álbum.
const CONCERT_TITLE = /^\d{4}\s*[-‐‑–./]\s*\d{1,2}\s*[-‐‑–./]\s*\d{1,2}\b|^\d{1,2}\s\d{1,2}\s\d{2}\b/
// Só disco de estúdio da discografia: qualquer tipo secundário (Live, Compilation, Soundtrack, Remix, Demo…) sai,
// e títulos de coletânea/ao vivo que o MusicBrainz às vezes deixa sem marcação também.
const NOT_STUDIO_TITLE =
  /\b(greatest hits|best of|the very best|anthology|compilation|unplugged|live (at|in|from|on)|in concert|karaoke|tribute to|b-?sides|rarities|remixes)\b/i
export const usable = (rg: Pick<RG, 'title' | 'first-release-date' | 'secondary-types'>) =>
  Boolean(rg['first-release-date']) && !CONCERT_TITLE.test(rg.title) && !NOT_STUDIO_TITLE.test(rg.title) && !rg['secondary-types']?.length

/** "Abbey Road (Remastered)" e "Abbey Road" viram a mesma chave. */
export function normalizeTitle(t: string) {
  return t
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[([][^)\]]*[)\]]/g, ' ')
    .replace(/\b(super )?(deluxe|remaster(ed)?|expanded|anniversary|edition|version|mix|bonus|reissue)\b.*$/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

export function dedupeAlbums(albums: Album[]): Album[] {
  const byKey = new Map<string, Album>()
  for (const a of albums) {
    const k = `${a.artist.toLowerCase()}|${normalizeTitle(a.title)}`
    const cur = byKey.get(k)
    if (!cur || (a.year ?? '9999') < (cur.year ?? '9999')) byKey.set(k, a)
  }
  return [...byKey.values()]
}

export async function searchArtists(q: string): Promise<Choice[]> {
  const query = lucene(q)
  if (query.length < 2) return []
  const r = await mb<{ artists: { id: string; name: string; score?: number; disambiguation?: string; country?: string }[] }>('/artist', { query, limit: 8 })
  // score baixo = só cita o termo (ex.: "toca no tributo ao X")
  return r.artists.filter((a) => (a.score ?? 100) >= 60).map((a) => ({ id: a.id, name: a.name, sub: [a.disambiguation, a.country].filter(Boolean).join(' · ') || undefined }))
}

/** Busca de álbum por título ou artista; o resultado já carrega título, artista e ano. */
export async function searchAlbums(q: string): Promise<Choice[]> {
  const t = lucene(q)
  if (t.length < 2) return []
  const r = await mb<{ 'release-groups': (RG & { score?: number })[] }>('/release-group', {
    query: `(releasegroup:(${t}) OR artist:(${t})) AND primarytype:album AND status:official`,
    limit: 15,
  })
  return dedupeAlbums(r['release-groups'].filter((rg) => (rg.score ?? 100) >= 50 && usable(rg)).map((rg) => toAlbum(rg)))
    .slice(0, 8)
    .map((a) => ({ id: a.id, name: a.title, sub: a.artist, year: a.year }))
}

/** O álbum escolhido vira Album sem novas consultas. */
export const choiceToAlbum = (c: Choice): Album => ({ id: c.id, title: c.name, artist: c.sub ?? '?', year: c.year })

const discographies = new Map<string, Promise<Album[]>>()

/** Álbuns do artista (EPs e singles são outros tipos primários e ficam de fora). */
export function artistAlbums(artist: Choice): Promise<Album[]> {
  return memo(discographies, `artist:${artist.id}`, async () => {
    const out: Album[] = []
    for (let offset = 0; offset < 300; offset += 100) {
      const r = await mb<{ 'release-groups': RG[]; 'release-group-count': number }>('/release-group', {
        artist: artist.id, type: 'album', limit: 100, offset,
      })
      out.push(...r['release-groups'].filter(usable).map((rg) => toAlbum(rg, artist.name)))
      if (offset + 100 >= r['release-group-count']) break
    }
    return dedupeAlbums(out)
  })
}

/** Quantos álbuns o gênero tem: não muda entre sorteios, então só pergunta uma vez (poupa 1 das 2 chamadas por sorteio). */
const genreCounts = new Map<string, Promise<number>>()
function genreCount(genre: string, query: string) {
  return memo(genreCounts, `genre:${genre}`, () => mb<{ count: number }>('/release-group', { query, limit: 1 }).then((h) => h.count))
}

/** Álbuns de um gênero: página aleatória dos resultados por tag, para fugir do óbvio. */
export async function genreAlbums(genre: string): Promise<Album[]> {
  const query = `tag:"${lucene(genre)}" AND primarytype:album AND status:official`
  const count = await genreCount(genre, query)
  if (!count) return []
  // a busca do MusicBrainz só entrega os primeiros 500 resultados (offset + limit <= 500)
  const offset = Math.floor(Math.random() * Math.max(1, Math.min(count, 500) - 25))
  const r = await mb<{ 'release-groups': RG[] }>('/release-group', { query, limit: 25, offset })
  return dedupeAlbums(r['release-groups'].filter(usable).map((rg) => toAlbum(rg)))
}

/** Resolve "artista + título" (ex.: vindo do Last.fm) para o release-group canônico. */
export async function resolveAlbum(artist: string, title: string): Promise<Album | null> {
  const query = `releasegroup:"${lucene(title)}" AND artist:"${lucene(artist)}" AND primarytype:album AND status:official`
  const r = await mb<{ 'release-groups': RG[] }>('/release-group', { query, limit: 3 })
  const want = normalizeTitle(title)
  const hit = r['release-groups'].filter(usable).find((rg) => normalizeTitle(rg.title) === want)
  return hit ? toAlbum(hit) : null
}

/** false só quando o Cover Art Archive confirma que não há capa; em erro de rede assume que há. */
const covers = new Map<string, Promise<boolean>>()
export function hasCover(id: string): Promise<boolean> {
  return memo(covers, `cover:${id}`, () => checkCover(id)).catch(() => true) // só resposta firme vai para o cache; erro de rede não
}

async function checkCover(id: string): Promise<boolean> {
  const r = await fetch(`https://coverartarchive.org/release-group/${id}`, { headers: { Accept: 'application/json' } })
  if (r.status === 404) return false
  if (!r.ok) throw new Error(`Cover Art Archive ${r.status}`)
  const j = (await r.json()) as { images?: { front?: boolean }[] }
  return Boolean(j.images?.some((i) => i.front))
}

export const spotifySearch = (a: Album) => `https://open.spotify.com/search/${encodeURIComponent(`${a.artist} ${a.title}`)}/albums`
export const ytmusicSearch = (a: Album) => `https://music.youtube.com/search?q=${encodeURIComponent(`${a.artist} ${a.title}`)}`

const details = new Map<string, Promise<AlbumDetails>>()

const VIDEO_DISC = /blu-?ray|dvd|video|vhs|laserdisc/i

export function albumDetails(id: string): Promise<AlbumDetails> {
  return memo(details, `details:${id}`, async () => {
    const rg = await mb<{
      releases?: { id: string; status?: string; date?: string }[]
      genres?: { name: string; count: number }[]
      tags?: { name: string; count: number }[]
    }>(`/release-group/${id}`, { inc: 'releases+genres+tags' })
    const rels = (rg.releases ?? [])
      .slice()
      .sort((a, b) => (a.status === 'Official' ? 0 : 1) - (b.status === 'Official' ? 0 : 1) || (a.date ?? '9999').localeCompare(b.date ?? '9999'))
    const tags = [...(rg.genres ?? []), ...(rg.tags ?? [])]
      .sort((a, b) => b.count - a.count)
      .map((t) => t.name)
      .filter((n, i, arr) => arr.indexOf(n) === i)
      .slice(0, 6)
    const out: AlbumDetails = { tracks: [], totalMs: 0, tags, links: {} }
    if (!rels[0]) return out
    const rel = await mb<{
      media?: { format?: string; tracks?: { title: string; length: number | null }[] }[]
      'label-info'?: { label?: { name: string } }[]
      relations?: { url?: { resource: string } }[]
    }>(`/release/${rels[0].id}`, { inc: 'recordings+labels+url-rels' })
    // edições com Blu-ray/DVD trazem as faixas de novo (mixagens surround, extras): só os discos de áudio entram
    out.tracks = (rel.media ?? []).filter((m) => !VIDEO_DISC.test(m.format ?? '')).flatMap((m) => m.tracks ?? []).map((t, i) => ({ n: i + 1, title: t.title, ms: t.length }))
    out.totalMs = out.tracks.reduce((s, t) => s + (t.ms ?? 0), 0)
    out.label = rel['label-info']?.find((l) => l.label)?.label?.name
    for (const { url } of rel.relations ?? []) {
      if (url?.resource.includes('open.spotify.com/album')) out.links.spotify ??= url.resource
      if (url?.resource.includes('music.youtube.com')) out.links.ytmusic ??= url.resource
    }
    return out
  })
}

/** Nome de faixa comparável entre edições: sem acento, sem "(feat. …)" e sem pontuação. */
export const trackKey = (t: string) => {
  const k = t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  return k.replace(/[([][^)\]]*[)\]]/g, ' ').replace(/[^a-z0-9]+/g, '') || k.replace(/[^a-z0-9]+/g, '')
}

const sides = new Map<string, Promise<Record<string, string>>>()

/**
 * Lado (A, B, C…) de cada faixa, lido de uma edição em vinil do álbum (a numeração "A1", "B3" do MusicBrainz).
 * A chave é o nome da faixa (`trackKey`). Sem edição em vinil catalogada devolve vazio: lado não se inventa.
 */
export function albumSides(id: string): Promise<Record<string, string>> {
  return memo(sides, `sides:${id}`, async () => {
    const r = await mb<{ releases?: { id: string; date?: string; media?: { format?: string }[] }[] }>('/release', {
      'release-group': id, inc: 'media', status: 'official', limit: 100,
    })
    const vinyl = (r.releases ?? [])
      .filter((x) => x.media?.some((m) => /vinyl/i.test(m.format ?? '')))
      .sort((a, b) => (a.date ?? '9999').localeCompare(b.date ?? '9999'))[0]
    if (!vinyl) return {}
    const rel = await mb<{ media?: { tracks?: { number?: string; title: string }[] }[] }>(`/release/${vinyl.id}`, { inc: 'recordings' })
    const out: Record<string, string> = {}
    for (const t of (rel.media ?? []).flatMap((m) => m.tracks ?? [])) {
      const side = /^([A-Za-z])\d+/.exec(t.number ?? '')?.[1]
      if (side) out[trackKey(t.title)] = side.toUpperCase()
    }
    return out
  })
}
