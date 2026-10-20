const KEY = import.meta.env.VITE_LASTFM_KEY as string | undefined

export const lastfmEnabled = Boolean(KEY)

async function lfm<T>(params: Record<string, string | number>): Promise<T> {
  const qs = new URLSearchParams({ api_key: KEY ?? '', format: 'json', ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])) })
  const r = await fetch(`https://ws.audioscrobbler.com/2.0/?${qs}`)
  const j = await r.json()
  if (j.error) throw Object.assign(new Error(j.message), { code: j.error })
  return j
}

export async function topAlbumsByTag(tag: string): Promise<{ artist: string; title: string }[]> {
  const j = await lfm<{ albums?: { album?: { name: string; artist: { name: string } }[] } }>({
    method: 'tag.gettopalbums', tag, limit: 50, page: 1 + Math.floor(Math.random() * 5),
  })
  return (j.albums?.album ?? []).map((a) => ({ artist: a.artist.name, title: a.name }))
}
