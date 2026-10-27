import { memo } from './cache'
import { itunesAlbum } from './preview'
import type { Album } from './types'

// "Ouvir no Spotify" e "YouTube Music". REGRA FIXA, documentada em PRODUCT.md ("Ouvir no Spotify e no YouTube Music")
// e travada em listen.test.ts:
// 1) achou o álbum no app: o botão abre direto a página do álbum (open.spotify.com/album/…, music.youtube.com/…);
// 2) não achou: abre a busca do app com o TÍTULO DO ÁLBUM e o NOME DO ARTISTA, nunca um termo fixo.
// A busca do Spotify é /search/<termo> e mais nada: com um segmento a mais no fim (o antigo ".../albums"),
// o app no celular trocava o termo por "albums" e todo disco abria a mesma busca.

export interface ListenLinks {
  spotify?: string
  ytmusic?: string
}

/** O termo das buscas: título do álbum e nome do artista ("?" é artista desconhecido e fica de fora). */
export const listenQuery = (a: Pick<Album, 'title' | 'artist'>) =>
  [a.title, a.artist === '?' ? '' : a.artist].join(' ').replace(/\s+/g, ' ').trim()

export const spotifySearch = (a: Pick<Album, 'title' | 'artist'>) => `https://open.spotify.com/search/${encodeURIComponent(listenQuery(a))}`
export const ytmusicSearch = (a: Pick<Album, 'title' | 'artist'>) => `https://music.youtube.com/search?q=${encodeURIComponent(listenQuery(a))}`

/** Só aceita link que é página de álbum: um link de faixa, artista ou busca vira busca pelo termo. */
export function albumPage(links: { spotify?: string; ytmusic?: string }): ListenLinks {
  const ok = (url: string | undefined, re: RegExp) => (url && re.test(url) ? url : undefined)
  return {
    spotify: ok(links.spotify, /^https:\/\/open\.spotify\.com\/album\/[A-Za-z0-9]+/),
    ytmusic: ok(links.ytmusic, /^https:\/\/music\.youtube\.com\/(playlist\?list=|browse\/MPREb)/),
  }
}

// Odesli (song.link): do álbum no iTunes chega ao mesmo álbum no Spotify e no YouTube Music. API pública, sem chave,
// com limite de 10 consultas por minuto: as buscas passam por esta fila, uma a cada 7 s (o iTunes também agradece).
const GAP_MS = 7000
let lastCall = -Infinity
let chain: Promise<unknown> = Promise.resolve()
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

function queued<T>(run: () => Promise<T>, wanted: () => boolean): Promise<T> {
  const p = chain.then(async () => {
    if (!wanted()) throw new DOMException('Ninguém mais espera este link', 'AbortError')
    const wait = lastCall + GAP_MS - Date.now()
    if (wait > 0) await sleep(wait)
    lastCall = Date.now()
    return run()
  })
  chain = p.catch(() => {})
  return p
}

async function odesli(pageUrl: string): Promise<ListenLinks> {
  const r = await fetch(`https://api.song.link/v1-alpha.1/links?${new URLSearchParams({ url: pageUrl, userCountry: 'BR' })}`)
  if (r.status === 400 || r.status === 404) return {} // o Odesli não conhece o álbum
  if (!r.ok) throw new Error(`Odesli ${r.status}`)
  const j = (await r.json()) as { linksByPlatform?: Record<string, { url?: string } | undefined> }
  return albumPage({ spotify: j.linksByPlatform?.spotify?.url, ytmusic: j.linksByPlatform?.youtubeMusic?.url })
}

const found = new Map<string, Promise<ListenLinks>>()
const watchers = new Map<string, number>() // quantas telas ainda esperam o link de cada álbum

/**
 * Página do álbum no Spotify e no YouTube Music, quando existe. Vazio quando o álbum não está nesses apps;
 * rejeita em erro de rede (e aí nada vai para o cache). Quem chama cai na busca (`spotifySearch`/`ytmusicSearch`) enquanto isso.
 * `release` avisa que a tela saiu: álbum que ninguém mais espera sai da fila sem gastar consulta.
 */
export function albumLinks(album: Album): { links: Promise<ListenLinks>; release: () => void } {
  const key = `links:${album.id}`
  watchers.set(key, (watchers.get(key) ?? 0) + 1)
  const links = memo(found, key, () =>
    queued(async () => {
      const hit = await itunesAlbum(album)
      return hit?.collectionViewUrl ? odesli(hit.collectionViewUrl) : {}
    }, () => (watchers.get(key) ?? 0) > 0),
  )
  let released = false
  const release = () => {
    if (released) return
    released = true
    const n = (watchers.get(key) ?? 1) - 1
    if (n > 0) watchers.set(key, n)
    else watchers.delete(key)
  }
  return { links, release }
}
