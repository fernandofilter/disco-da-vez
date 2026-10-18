import { motion } from 'motion/react'
import { CircleCheck, Copy, Disc3, Link2, Loader2, RotateCcw, Shuffle, Undo2, Vote } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import type { GroupState } from '@/hooks/useGroup'
import { api } from '@/lib/api'
import { drawAlbums } from '@/lib/albums'
import { lastfmEnabled, lastfmUserExists } from '@/lib/lastfm'
import type { Album, Kind, Mode, Round } from '@/lib/types'
import { cn } from '@/lib/utils'
import { AlbumCard } from './AlbumCard'
import { ChoicePicker } from './ChoicePicker'
import { HistoryList } from './HistoryList'
import { MemberList } from './MemberList'
import { Roulette } from './Roulette'
import { VotePanel } from './VotePanel'
import { Button } from './ui/button'
import { Card } from './ui/card'
import { Input } from './ui/input'

const fail = (e: Error) => toast.error(e.message)
const SKIP_AFTER_MS = 10_000

function Segmented<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { v: T; label: string; icon: React.ReactNode }[] }) {
  return (
    <div className="grid grid-cols-2 gap-1 rounded-xl border bg-background/40 p-1">
      {options.map((o) => (
        <button
          key={o.v}
          onClick={() => onChange(o.v)}
          aria-pressed={value === o.v}
          className={cn('flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors', value === o.v ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}
        >
          {o.icon} {o.label}
        </button>
      ))}
    </div>
  )
}

function Section({ title, children, hint }: { title: string; children: React.ReactNode; hint?: string }) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
      </div>
      {children}
    </section>
  )
}

/** Roleta + cartão do álbum. Quem chega depois do fim da animação vê o resultado direto. */
function Reveal({ round, album, pool, children }: { round: Round; album: Album; pool: Album[]; children: (rolled: boolean) => React.ReactNode }) {
  const [first] = useState(round.spin)
  const [initialAge] = useState(() => (round.result_at ? Date.now() - new Date(round.result_at).getTime() : 0))
  const skip = round.spin === first && initialAge > SKIP_AFTER_MS
  const [rolled, setRolled] = useState(skip)
  useEffect(() => setRolled(skip), [round.spin, skip])
  return (
    <div className="space-y-5">
      <Roulette winner={album} pool={pool} seed={round.id} spinKey={round.spin} skip={skip} onDone={() => setRolled(true)} />
      {rolled && <AlbumCard album={album} />}
      {children(rolled)}
    </div>
  )
}

export function GroupView({ data, refresh }: { data: GroupState; refresh: () => void }) {
  const { group, members, me, round, choices, votes, history, userId } = data
  const isLeader = group.leader_id === userId
  const [mode, setMode] = useState<Mode>(group.last_mode)
  const [kind, setKind] = useState<Kind>(group.last_kind)
  const [busy, setBusy] = useState<string | null>(null) // texto de progresso do sorteio
  const [lastfm, setLastfm] = useState(me?.lastfm_user ?? '')
  const closing = useRef(false)

  const active = round && round.status !== 'done' ? round : null
  const participants = members.filter((m) => active?.participants.includes(m.id))
  const myChoice = me && choices.find((c) => c.member_id === me.id)
  const allReady = participants.length >= 2 && participants.every((m) => choices.find((c) => c.member_id === m.id)?.ready)
  const allVoted = participants.length > 0 && participants.every((m) => choices.find((c) => c.member_id === m.id)?.voted)
  const leaderMember = members.find((m) => m.user_id === group.leader_id)
  const leaderStale = !isLeader && (!leaderMember || Date.now() - new Date(leaderMember.last_seen).getTime() > 7 * 86_400_000)

  // todos votaram: o líder encerra sozinho (o servidor sorteia o desempate)
  useEffect(() => {
    if (isLeader && active?.status === 'voting' && allVoted && !closing.current) {
      closing.current = true
      api.closeVote(active.id).catch(fail).finally(() => (closing.current = false))
    }
  }, [isLeader, active?.status, active?.id, allVoted])

  async function run(r: Round) {
    const count = r.kind === 'vote' ? 6 : 1
    setBusy(r.kind === 'vote' ? `Garimpando álbuns 0/${count}…` : 'Garimpando um álbum…')
    try {
      const { albums, filler } = await drawAlbums({
        mode: r.mode,
        members: participants,
        choices: Object.fromEntries(choices.map((c) => [c.member_id, c.items])),
        historyIds: history.map((h) => h.album_id),
        count,
        onProgress: (d, t) => r.kind === 'vote' && setBusy(`Garimpando álbuns ${d}/${t}…`),
      })
      if (albums.length < (r.kind === 'vote' ? 2 : 1)) {
        return toast.error('Não achei álbuns suficientes com essas escolhas (histórico, já escutados ou sem capa). Troquem algumas escolhas.')
      }
      if (r.kind === 'vote') {
        if (albums.length < 6) toast.info(`Só consegui ${albums.length} álbuns para a votação.`)
        await api.publishVote(r.id, albums)
      } else {
        await api.publishDraw(r.id, { album: albums[0], filler })
      }
    } catch (e) {
      fail(e as Error)
    } finally {
      setBusy(null)
    }
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault()
    if (!me) return
    if (lastfm.trim() && !(await lastfmUserExists(lastfm.trim()))) return toast.error('Usuário do Last.fm não encontrado.')
    api.updateProfile(group.id, me.name, lastfm).then(() => toast.success('Perfil salvo'), fail)
  }

  if (!me) return null
  const lobbyRound = round?.status === 'done' ? round : null
  const winner = lobbyRound?.result?.album
  const tied = lobbyRound?.result?.tied ?? []

  return (
    <main className="mx-auto max-w-4xl space-y-8 px-4 py-6 sm:py-10">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-sm text-muted-foreground"><Disc3 className="size-4 animate-[spin_6s_linear_infinite] text-primary" /> Album Sort</p>
          <h1 className="text-3xl font-bold">{group.name}</h1>
        </div>
        <Button
          variant="outline"
          onClick={() => navigator.clipboard.writeText(`${location.origin}/g/${group.id}`).then(() => toast.success('Link do convite copiado'), () => toast.error('Não consegui copiar'))}
        >
          <Link2 /> Copiar convite <Copy className="opacity-60" />
        </Button>
      </header>

      <Section title={`Pessoas (${members.length}/6)`} hint={isLeader ? 'Você é o líder: pode remover pessoas e passar a liderança.' : undefined}>
        <MemberList group={group} members={members} me={me} isLeader={isLeader} choices={active ? choices : []} showStatus={active?.status === 'choosing' ? 'ready' : active?.status === 'voting' ? 'voted' : null} />
        {leaderStale && (
          <Button variant="secondary" onClick={() => api.claimLeadership(group.id).then(refresh, fail)}>O líder sumiu há 7+ dias: assumir liderança</Button>
        )}
        <details className="text-sm">
          <summary className="cursor-pointer text-muted-foreground">Meu perfil{lastfmEnabled ? ' · Last.fm' : ''}</summary>
          {lastfmEnabled ? (
            <form onSubmit={saveProfile} className="mt-2 flex gap-2">
              <Input value={lastfm} onChange={(e) => setLastfm(e.target.value)} placeholder="Usuário do Last.fm (evita álbuns que você já ouviu)" maxLength={40} />
              <Button type="submit" variant="secondary">Salvar</Button>
            </form>
          ) : (
            <p className="mt-2 text-muted-foreground">O filtro de álbuns já escutados precisa de uma chave da API do Last.fm (VITE_LASTFM_KEY).</p>
          )}
        </details>
      </Section>

      {/* ---------- sem rodada ativa */}
      {!active && (
        <Section title={isLeader ? 'Nova rodada' : 'Aguardando o líder'} hint={isLeader ? 'Cada um escolhe até 5 e o sistema cuida do resto.' : 'O líder vai iniciar a próxima rodada.'}>
          {lobbyRound && winner && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Última rodada ({lobbyRound.kind === 'vote' ? 'votação' : 'sorteio'}):</p>
              {lobbyRound.kind === 'vote' && tied.length > 1 ? (
                <Reveal round={lobbyRound} album={winner} pool={tied.concat(lobbyRound.candidates ?? [])}>{() => null}</Reveal>
              ) : (
                <AlbumCard album={winner} />
              )}
            </div>
          )}
          {isLeader && (
            <Card className="space-y-4 p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Segmented value={mode} onChange={setMode} options={[{ v: 'artist', label: 'Bandas/artistas', icon: <Disc3 className="size-4" /> }, { v: 'genre', label: 'Gêneros', icon: <Disc3 className="size-4" /> }]} />
                <Segmented value={kind} onChange={setKind} options={[{ v: 'draw', label: 'Sorteio', icon: <Shuffle className="size-4" /> }, { v: 'vote', label: 'Votação', icon: <Vote className="size-4" /> }]} />
              </div>
              <Button size="lg" disabled={members.length < 2} onClick={() => api.startRound(group.id, mode, kind).then(refresh, fail)}>
                {members.length < 2 ? 'Convide pelo menos mais 1 pessoa' : 'Iniciar rodada'}
              </Button>
            </Card>
          )}
        </Section>
      )}

      {/* ---------- escolhas */}
      {active?.status === 'choosing' && (
        <Section title={active.mode === 'artist' ? 'Escolha suas bandas/artistas' : 'Escolha seus gêneros'} hint={`${active.kind === 'vote' ? 'Votação' : 'Sorteio'} · de 1 a 5 escolhas`}>
          {myChoice && active.participants.includes(me.id) ? (
            <Card className="p-4"><ChoicePicker roundId={active.id} mode={active.mode} initial={myChoice.items} ready={myChoice.ready} /></Card>
          ) : (
            <p className="text-muted-foreground">Você entrou com a rodada em andamento: participa da próxima.</p>
          )}
          {isLeader && (
            <Button size="lg" disabled={!allReady || !!busy} onClick={() => run(active)}>
              {busy ? <><Loader2 className="animate-spin" /> {busy}</> : allReady ? (active.kind === 'vote' ? <><Vote /> Iniciar votação</> : <><Shuffle /> Sortear álbum</>) : 'Aguardando todos confirmarem…'}
            </Button>
          )}
        </Section>
      )}

      {/* ---------- sorteio em andamento */}
      {active?.status === 'drawing' && active.result && (
        <Section title="Sorteio">
          <Reveal round={active} album={active.result.album} pool={active.result.filler ?? []}>
            {(rolled) =>
              rolled && isLeader ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-wrap gap-2">
                  <Button size="lg" onClick={() => api.confirmDraw(active.id).then(refresh, fail)}><CircleCheck /> Vamos ouvir esse</Button>
                  <Button variant="secondary" size="lg" disabled={!!busy} onClick={() => run(active)}>
                    {busy ? <><Loader2 className="animate-spin" /> {busy}</> : <><RotateCcw /> Sortear de novo</>}
                  </Button>
                  <Button variant="outline" size="lg" onClick={() => api.backToChoosing(active.id).then(refresh, fail)}><Undo2 /> Voltar às escolhas</Button>
                </motion.div>
              ) : rolled ? (
                <p className="text-sm text-muted-foreground">Aguardando o líder confirmar ou sortear de novo…</p>
              ) : null
            }
          </Reveal>
        </Section>
      )}

      {/* ---------- votação */}
      {active?.status === 'voting' && active.candidates && (
        <Section title="Votação" hint="Seu voto é secreto até todos votarem. Dá para trocar antes de encerrar.">
          <VotePanel roundId={active.id} candidates={active.candidates} myVote={votes.find((v) => v.member_id === me.id)?.album_id} />
          {isLeader && !allVoted && (
            <Button variant="outline" onClick={() => api.closeVote(active.id).catch(fail)}>Encerrar votação agora</Button>
          )}
        </Section>
      )}

      <Section title="Já ouvimos" hint="Nunca mais entram nos sorteios deste grupo.">
        <HistoryList items={history} />
      </Section>
    </main>
  )
}
