import { useEffect, useState } from 'react'
import { albumLinks, albumPage, spotifySearch, ytmusicSearch } from '@/lib/listen'
import type { ListenLinks } from '@/lib/listen'
import type { Album } from '@/lib/types'

/**
 * Para onde vão os botões de ouvir: a página do álbum no app quando ela é conhecida (MusicBrainz primeiro, depois o Odesli),
 * senão a busca pelo título e pelo artista. Os botões funcionam desde o primeiro instante e trocam de destino quando o álbum é achado.
 */
export function useListenLinks(album: Album, fromMusicBrainz?: ListenLinks): { spotify: string; ytmusic: string } {
  const [found, setFound] = useState<{ id: string; links: ListenLinks } | null>(null)
  useEffect(() => {
    let live = true
    const { links, release } = albumLinks(album)
    links.then((l) => live && setFound({ id: album.id, links: l }), () => {})
    return () => {
      live = false
      release()
    }
  }, [album.id]) // eslint-disable-line react-hooks/exhaustive-deps -- o objeto muda a cada leitura em tempo real; o id não
  const mb = albumPage(fromMusicBrainz ?? {})
  const app = found?.id === album.id ? found.links : {} // o achado de outro álbum não vale para este
  return {
    spotify: mb.spotify ?? app.spotify ?? spotifySearch(album),
    ytmusic: mb.ytmusic ?? app.ytmusic ?? ytmusicSearch(album),
  }
}
