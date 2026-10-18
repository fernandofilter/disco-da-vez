import { useState } from 'react'
import { AlbumCard } from '@/components/AlbumCard'
import { ChoicePicker } from '@/components/ChoicePicker'
import { Roulette } from '@/components/Roulette'
import { VotePanel } from '@/components/VotePanel'
import { Button } from '@/components/ui/button'
import { shuffle } from '@/lib/draw'
import { artistAlbums, searchArtists } from '@/lib/musicbrainz'
import type { Album } from '@/lib/types'

/** Só em dev: exercita MusicBrainz + Cover Art Archive + roleta sem precisar de Supabase. */
export default function Demo() {
  const [albums, setAlbums] = useState<Album[]>([])
  const [spin, setSpin] = useState(0)
  const [log, setLog] = useState('')
  const [winner, setWinner] = useState<Album | null>(null)

  async function load() {
    setLog('buscando artista…')
    const [a] = await searchArtists('Radiohead')
    setLog(`artista: ${a.name} (${a.id}); buscando discografia…`)
    const list = await artistAlbums(a)
    setAlbums(list)
    setLog(`${list.length} álbuns: ${list.slice(0, 40).map((x) => `${x.title} (${x.year})`).join(' | ')}`)
    setWinner(shuffle(list)[0])
    setSpin((s) => s + 1)
  }

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-4">
      <Button onClick={load}>Carregar Radiohead e girar</Button>
      <p data-testid="log" className="text-xs text-muted-foreground">{log}</p>
      {winner && <Roulette winner={winner} pool={albums} seed="demo" spinKey={spin} />}
      {winner && <AlbumCard album={winner} />}
      {albums.length > 0 && <VotePanel roundId="demo" candidates={albums.slice(0, 6)} />}
      <ChoicePicker roundId="demo" mode="genre" initial={[]} ready={false} />
    </main>
  )
}
