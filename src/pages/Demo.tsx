import { RotateCcw } from 'lucide-react'
import { useEffect, useState } from 'react'
import { AlbumCard } from '@/components/AlbumCard'
import { ChoicePicker } from '@/components/ChoicePicker'
import { GroupView } from '@/components/GroupView'
import { Roulette } from '@/components/Roulette'
import { VotePanel } from '@/components/VotePanel'
import { Button } from '@/components/ui/button'
import { Rounds } from '@/pages/History'
import { shuffle } from '@/lib/draw'
import { artistAlbums, searchArtists } from '@/lib/musicbrainz'
import type { GroupState } from '@/hooks/useGroup'
import type { Album, Member, Round, RoundChoice } from '@/lib/types'

/** `/demo?room=idle|choosing|voting|drawing|spin`: a tela do grupo com dados fictícios (sem Supabase). `spin` já gira a roleta ao abrir; o botão no canto gira de novo (e libera o som). */
function Room({ scenario }: { scenario: string }) {
  const [albums, setAlbums] = useState<Album[]>([])
  const [spin, setSpin] = useState(1)
  const [arrived, setArrived] = useState(scenario !== 'deal') // `deal`: a votação abre sem álbuns e eles chegam 2,5 s depois
  useEffect(() => {
    if (scenario === 'deal') setTimeout(() => setArrived(true), 2500)
  }, [scenario])
  useEffect(() => {
    searchArtists('Radiohead').then(([a]) => artistAlbums(a)).then(setAlbums, () => setAlbums([]))
  }, [])
  const now = new Date().toISOString()
  const names = ['Fernando', 'Bia', 'Caio', 'Dani']
  const members: Member[] = names.map((name, i) => ({ id: `m${i}`, group_id: 'g', user_id: `u${i}`, name, lastfm_user: i === 1 ? 'bia_fm' : null, last_choices: {}, last_seen: now, joined_at: now }))
  const live = scenario === 'spin' || spin > 1
  const status = scenario === 'idle' ? null : scenario === 'choosing' ? 'choosing' : scenario === 'voting' || scenario === 'deal' ? 'voting' : 'drawing'
  const round: Round | null = status
    ? {
        id: 'r1', group_id: 'g', mode: 'artist', kind: scenario === 'voting' || scenario === 'deal' ? 'vote' : 'draw', status, participants: members.map((m) => m.id),
        candidates: (scenario === 'voting' || scenario === 'deal') && arrived && albums.length ? albums.slice(0, 6) : null,
        ...(scenario === 'deal' && arrived && albums.length ? { result: { filler: albums } as never } : {}),
        result: (scenario === 'drawing' || scenario === 'spin') && albums.length ? { album: albums[3] ?? albums[0], filler: albums } : null,
        spin, result_at: new Date(Date.now() - (live ? 0 : 60_000)).toISOString(),
      }
    : null
  const choices: RoundChoice[] = round
    ? members.map((m, i) => ({ round_id: 'r1', member_id: m.id, items: [{ id: `a${i}`, name: ['Radiohead', 'Björk', 'Os Mutantes'][i % 3] }], ready: i % 2 === 1, voted: i === 1 || i === 2 }))
    : []
  const data: GroupState = { userId: 'u0', group: { id: 'abc123', name: 'Clube da Quinta', leader_id: 'u0', last_mode: 'artist', last_kind: 'draw' }, members, me: members[0], round, rounds: round ? [{ id: round.id, kind: round.kind, mode: round.mode, created_at: now }] : [], choices, votes: scenario === 'voting' && albums[1] ? [{ round_id: 'r1', member_id: 'm0', album_id: albums[1].id }] : [], history: [] }
  if (scenario === 'history') {
    const metas = albums.slice(0, 3).map((_, i) => ({ id: `r${i}`, kind: (i === 1 ? 'vote' : 'draw') as Round['kind'], mode: 'artist' as const, created_at: now }))
    const done = albums.slice(0, 3).map((album, i) => ({ id: `h${i}`, album_id: album.id, album, round_id: `r${i}`, confirmed_at: now })).reverse()
    return <Rounds data={{ ...data, rounds: metas, history: done }} />
  }
  return (
    <>
      <GroupView data={data} refresh={() => {}} />
      {status === 'drawing' && (
        <Button size="lg" className="fixed bottom-4 right-4 z-50 shadow-[0_10px_20px_-8px_rgb(0_0_0/0.4)]" onClick={() => setSpin((s) => s + 1)}>
          <RotateCcw /> Girar de novo (demo)
        </Button>
      )}
    </>
  )
}

/** Só em dev: exercita MusicBrainz + Cover Art Archive + roleta sem precisar de Supabase. */
export default function Demo() {
  const room = new URLSearchParams(location.search).get('room')
  return room ? <Room scenario={room} /> : <Playground />
}

function Playground() {
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
