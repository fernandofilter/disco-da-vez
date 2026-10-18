import type { Album, Choice } from './types'

export type Rng = () => number

/** PRNG determinístico (mulberry32): todos os celulares montam a mesma roleta a partir do mesmo seed. */
export function seeded(seed: string): Rng {
  let h = 1779033703 ^ seed.length
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 3432918353) << 13 | h >>> 19
  let a = h
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function shuffle<T>(items: T[], rng: Rng = Math.random): T[] {
  const a = items.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** Álbum candidato; `resolve` é preguiçoso porque itens do Last.fm precisam virar release-group antes. */
export interface Candidate {
  key: string
  /** Já conhecido sem custo (artista/MusicBrainz); serve de enchimento da roleta. */
  album?: Album
  resolve(): Promise<Album | null>
}

export interface DrawInput {
  members: { id: string; choices: Choice[] }[]
  pool(choice: Choice): Promise<Candidate[]>
  /** Capa existe e nenhum membro vinculado já escutou. */
  accept(album: Album): Promise<boolean>
  /** ids de álbuns já no histórico do grupo */
  exclude: Set<string>
  rng?: Rng
  onProgress?(done: number, total: number): void
}

const MAX_TRIES_PER_CHOICE = 12
const BATCH = 4

/**
 * Membro uniforme → escolha uniforme → álbum uniforme. Se uma ponta não rende álbum
 * (pool vazio, tudo já escutado), cai para a próxima na ordem sorteada.
 */
export async function pickAlbums(input: DrawInput, count: number): Promise<{ albums: Album[]; seen: Album[] }> {
  const rng = input.rng ?? Math.random
  const exclude = new Set(input.exclude)
  const albums: Album[] = []
  const seen: Album[] = []
  const rejected = new Set<string>()

  async function pickOne(): Promise<Album | null> {
    for (const m of shuffle(input.members, rng)) {
      for (const choice of shuffle(m.choices, rng)) {
        let pool: Candidate[]
        try {
          pool = await input.pool(choice)
        } catch {
          continue
        }
        const fresh = shuffle(pool, rng).filter((c) => !exclude.has(c.key) && !rejected.has(c.key))
        // verifica em lotes paralelos (capa/Last.fm são requisições lentas); vale o primeiro aceito na ordem sorteada
        const tries = fresh.slice(0, MAX_TRIES_PER_CHOICE)
        for (let i = 0; i < tries.length; i += BATCH) {
          const batch = await Promise.all(
            tries.slice(i, i + BATCH).map(async (c) => {
              const album = await c.resolve().catch(() => null)
              if (!album || exclude.has(album.id)) return { c, album: null, ok: false }
              return { c, album, ok: await input.accept(album).catch(() => false) }
            }),
          )
          for (const r of batch) {
            if (r.album) seen.push(r.album)
            if (!r.ok) rejected.add(r.c.key)
          }
          const hit = batch.find((r) => r.ok)
          if (hit) return hit.album
        }
      }
    }
    return null
  }

  while (albums.length < count) {
    const a = await pickOne()
    if (!a) break
    albums.push(a)
    exclude.add(a.id)
    input.onProgress?.(albums.length, count)
  }
  return { albums, seen }
}
