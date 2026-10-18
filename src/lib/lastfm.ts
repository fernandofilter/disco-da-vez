const KEY = import.meta.env.VITE_LASTFM_KEY as string | undefined

export const lastfmEnabled = Boolean(KEY)

async function lfm<T>(params: Record<string, string | number>): Promise<T> {
  const qs = new URLSearchParams({ api_key: KEY ?? '', format: 'json', ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])) })
  const r = await fetch(`https://ws.audioscrobbler.com/2.0/?${qs}`)
  const j = await r.json()
  if (j.error) throw Object.assign(new Error(j.message), { code: j.error })
  return j
}

/** Usuário Last.fm existe? Sem chave configurada não dá para validar, então aceita. */
export async function lastfmUserExists(user: string): Promise<boolean> {
  if (!lastfmEnabled) return true
  try {
    await lfm({ method: 'user.getinfo', user })
    return true
  } catch (e) {
    return (e as { code?: number }).code !== 6
  }
}

export async function topAlbumsByTag(tag: string): Promise<{ artist: string; title: string }[]> {
  const j = await lfm<{ albums?: { album?: { name: string; artist: { name: string } }[] } }>({
    method: 'tag.gettopalbums', tag, limit: 50, page: 1 + Math.floor(Math.random() * 5),
  })
  return (j.albums?.album ?? []).map((a) => ({ artist: a.artist.name, title: a.name }))
}

/**
 * "Já escutou" = plays do álbum no Last.fm ≥ nº de faixas.
 * ponytail: aproximação por total de plays; o histórico por faixa custaria 1 requisição por faixa.
 */
export async function userListened(user: string, artist: string, album: string): Promise<boolean> {
  try {
    const j = await lfm<{ album?: { userplaycount?: string; tracks?: { track?: unknown[] | object } } }>({
      method: 'album.getinfo', artist, album, username: user, autocorrect: 1,
    })
    const plays = Number(j.album?.userplaycount ?? 0)
    const t = j.album?.tracks?.track
    const tracks = Array.isArray(t) ? t.length : t ? 1 : 0
    return tracks > 0 && plays >= tracks
  } catch {
    return false
  }
}
