import { afterEach, describe, expect, it, vi } from 'vitest'
import { albumLinks, albumPage, listenQuery, spotifySearch, ytmusicSearch } from './listen'

// Regra fixa (PRODUCT.md, "Ouvir no Spotify e no YouTube Music"): se um destes testes quebrar, a mudança está errada, não o teste.
const okc = { id: 'rg-okc', title: 'OK Computer', artist: 'Radiohead', year: '1997' }

describe('busca de ouvir', () => {
  it('leva o título do álbum e o nome do artista', () => {
    expect(listenQuery(okc)).toBe('OK Computer Radiohead')
    expect(listenQuery({ title: 'Acabou Chorare', artist: 'Novos Baianos' })).toBe('Acabou Chorare Novos Baianos')
  })

  it('Spotify: /search/<título e artista>, sem segmento depois do termo', () => {
    const url = spotifySearch(okc)
    expect(url).toBe('https://open.spotify.com/search/OK%20Computer%20Radiohead')
    const term = decodeURIComponent(new URL(url).pathname.split('/').pop()!)
    expect(term).toBe('OK Computer Radiohead')
    expect(url).not.toMatch(/\/albums?$/)
  })

  it('YouTube Music: ?q=<título e artista>', () => {
    const url = ytmusicSearch(okc)
    expect(url).toBe('https://music.youtube.com/search?q=OK%20Computer%20Radiohead')
    expect(new URL(url).searchParams.get('q')).toBe('OK Computer Radiohead')
  })

  it('cada álbum busca o seu termo, nunca um termo fixo', () => {
    const other = { id: 'rg-2', title: 'Clube da Esquina', artist: 'Milton Nascimento & Lô Borges' }
    expect(spotifySearch(other)).not.toBe(spotifySearch(okc))
    expect(new URL(ytmusicSearch(other)).searchParams.get('q')).toBe('Clube da Esquina Milton Nascimento & Lô Borges')
  })

  it('artista desconhecido ("?") fica fora do termo', () => {
    expect(listenQuery({ title: 'Disco', artist: '?' })).toBe('Disco')
  })
})

describe('página do álbum', () => {
  it('aceita só página de álbum', () => {
    expect(albumPage({ spotify: 'https://open.spotify.com/album/6dVIqQ8qmQ5GBnJ9shOYGE', ytmusic: 'https://music.youtube.com/playlist?list=OLAK5uy_abc' })).toEqual({
      spotify: 'https://open.spotify.com/album/6dVIqQ8qmQ5GBnJ9shOYGE',
      ytmusic: 'https://music.youtube.com/playlist?list=OLAK5uy_abc',
    })
    expect(albumPage({ ytmusic: 'https://music.youtube.com/browse/MPREb_xyz' }).ytmusic).toBe('https://music.youtube.com/browse/MPREb_xyz')
    expect(albumPage({ spotify: 'https://open.spotify.com/track/abc', ytmusic: 'https://music.youtube.com/channel/UC123' })).toEqual({ spotify: undefined, ytmusic: undefined })
  })

  afterEach(() => vi.unstubAllGlobals())

  it('acha o álbum no iTunes e abre direto a página dele no Spotify e no YouTube Music', async () => {
    const calls: string[] = []
    vi.stubGlobal('fetch', async (input: string) => {
      calls.push(input)
      const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200 })
      if (input.startsWith('https://itunes.apple.com/search')) {
        return json({ results: [{ collectionId: 1097861387, collectionName: 'OK Computer', artistName: 'Radiohead', collectionViewUrl: 'https://music.apple.com/us/album/ok-computer/1097861387' }] })
      }
      if (input.startsWith('https://api.song.link/')) {
        return json({
          linksByPlatform: {
            spotify: { url: 'https://open.spotify.com/album/6dVIqQ8qmQ5GBnJ9shOYGE' },
            youtubeMusic: { url: 'https://music.youtube.com/playlist?list=OLAK5uy_okc' },
          },
        })
      }
      return new Response('', { status: 404 })
    })
    const { links, release } = albumLinks(okc)
    expect(await links).toEqual({ spotify: 'https://open.spotify.com/album/6dVIqQ8qmQ5GBnJ9shOYGE', ytmusic: 'https://music.youtube.com/playlist?list=OLAK5uy_okc' })
    release()
    const odesli = new URL(calls.find((c) => c.startsWith('https://api.song.link/'))!)
    expect(odesli.searchParams.get('url')).toBe('https://music.apple.com/us/album/ok-computer/1097861387')
  })
})
