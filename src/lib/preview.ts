import { normalizeTitle, trackKey } from './musicbrainz'
import type { Album, AlbumDetails } from './types'

// Prévias de 30 s do iTunes (API pública, sem chave, com CORS). Casa o álbum pelo título e as faixas pelo nome.
interface ItunesRow {
  wrapperType?: string
  collectionId?: number
  collectionName?: string
  artistName?: string
  trackName?: string
  trackNumber?: number
  previewUrl?: string
}

const itunes = async (path: string, params: Record<string, string | number>): Promise<ItunesRow[]> => {
  const r = await fetch(`https://itunes.apple.com/${path}?${new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)]))}`)
  if (!r.ok) throw new Error(`iTunes ${r.status}`)
  return (await r.json()).results ?? []
}

const cache = new Map<string, Promise<(tracks: AlbumDetails['tracks']) => Record<number, string>>>()

/** Devolve, para a lista de faixas do MusicBrainz, o link da prévia de cada uma (número da faixa → URL). */
export function previews(album: Album): Promise<(tracks: AlbumDetails['tracks']) => Record<number, string>> {
  let p = cache.get(album.id)
  if (!p) {
    p = (async () => {
      const want = normalizeTitle(album.title)
      const artist = album.artist.toLowerCase().split(' & ')[0]
      const find = (rows: ItunesRow[]) => rows.find((a) => normalizeTitle(a.collectionName ?? '') === want && (a.artistName ?? '').toLowerCase().includes(artist))
      const search = (term: string, limit: number) => itunes('search', { term, media: 'music', entity: 'album', limit })
      // a busca combinada erra em títulos curtos ou genéricos; se falhar, olha o catálogo do artista
      const hit = find(await search(`${album.artist} ${album.title}`, 10)) ?? find(await search(album.artist, 50))
      if (!hit?.collectionId) return () => ({})
      const songs = (await itunes('lookup', { id: hit.collectionId, entity: 'song' })).filter((s) => s.wrapperType === 'track' && s.previewUrl)
      const byName = new Map(songs.map((s) => [trackKey(s.trackName ?? ''), s.previewUrl as string]))
      return (tracks) => Object.fromEntries(tracks.flatMap((t) => {
        const url = byName.get(trackKey(t.title))
        return url ? [[t.n, url]] : []
      }))
    })()
    p.catch(() => cache.delete(album.id))
    cache.set(album.id, p)
  }
  return p
}
