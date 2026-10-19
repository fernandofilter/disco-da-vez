import { pickAlbums, shuffle, type Candidate } from './draw'
import { lastfmEnabled, topAlbumsByTag, userListened } from './lastfm'
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

/** Capa existe e nenhum membro com Last.fm vinculado já escutou o álbum. */
export function acceptor(members: Member[]) {
  const users = lastfmEnabled ? members.map((m) => m.lastfm_user).filter((u): u is string => Boolean(u)) : []
  return async (album: Album) => {
    if (!(await hasCover(album.id))) return false
    const listened = await Promise.all(users.map((u) => userListened(u, album.artist, album.title)))
    return !listened.some(Boolean)
  }
}

export async function drawAlbums(opts: {
  mode: Mode
  members: Member[]
  choices: Record<string, Choice[]>
  historyIds: string[]
  count: number
  onProgress?: (done: number, total: number) => void
}): Promise<{ albums: Album[]; filler: Album[] }> {
  const known = new Map<string, Album>()
  const pool = poolFor(opts.mode)
  const { albums } = await pickAlbums(
    {
      members: opts.members.map((m) => ({ id: m.id, choices: opts.choices[m.id] ?? [] })).filter((m) => m.choices.length),
      pool: async (c) => {
        const list = await pool(c)
        for (const x of list) if (x.album) known.set(x.album.id, x.album)
        return list
      },
      accept: acceptor(opts.members),
      exclude: new Set(opts.historyIds),
      onProgress: opts.onProgress,
    },
    opts.count,
  )
  const picked = new Set(albums.map((a) => a.id))
  return { albums, filler: shuffle([...known.values()].filter((a) => !picked.has(a.id))).slice(0, 24) }
}

export const toResult = (album: Album, filler: Album[]): DrawResult => ({ album, filler })
