import { motion } from 'motion/react'
import { CircleCheck, Disc3, KeyRound, Link2, Loader2, Mic, RotateCcw, Shuffle, Tags, Undo2, Vote } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import type { GroupState } from '@/hooks/useGroup'
import { api } from '@/lib/api'
import { drawAlbums } from '@/lib/albums'
import { lastfmEnabled, lastfmUserExists } from '@/lib/lastfm'
import { sfx } from '@/lib/sound'
import type { Album, Kind, Mode, Round } from '@/lib/types'
import { cn } from '@/lib/utils'
import { AlbumCard } from './AlbumCard'
import { LastfmIcon } from './Brand'
import { ChoicePicker } from './ChoicePicker'
import { Agora, Chip, Masthead, Segmented, SoundToggle } from './Guide'
import type { MarkState } from './Guide'
import { HistoryList } from './HistoryList'
import { MemberList } from './MemberList'
import { Roulette } from './Roulette'
import { VotePanel } from './VotePanel'
import { Button } from './ui/button'
import { Card } from './ui/card'
import { Input } from './ui/input'

const fail = (e: Error) => {
  sfx.error()
  toast.error(e.message)
}
const SKIP_AFTER_MS = 10_000
const LOCK_HOLD_MS = 1600 // quanto a fita fica parada no vencedor antes de sair de cena

function Section({ title, children, hint }: { title: string; children: React.ReactNode; hint?: string }) {
  return (
    <section className="space-y-3 border-t-[3px] border-foreground pt-3">
      <div>
        <h2 className="text-3xl">{title}</h2>
        {hint && <p className="mt-2 text-sm text-muted-foreground">{hint}</p>}
      </div>
      {children}
    </section>
  )
}

/** A fita gira e trava no álbum; um instante depois ela some e fica só o resultado. Quem chega depois do fim da animação vê o resultado direto. */
function Reveal({ round, album, pool, children }: { round: Round; album: Album; pool: Album[]; children: (rolled: boolean) => React.ReactNode }) {
  const [first] = useState(round.spin)
  const [initialAge] = useState(() => (round.result_at ? Date.now() - new Date(round.result_at).getTime() : 0))
  const skip = round.spin === first && initialAge > SKIP_AFTER_MS
  const [landed, setLanded] = useState(skip) // a fita parou
  const [rolled, setRolled] = useState(skip) // a fita saiu de cena
  useEffect(() => {
    setLanded(skip)
    setRolled(skip)
  }, [round.spin, skip])
  useEffect(() => {
    if (!landed) return
    const t = setTimeout(() => setRolled(true), LOCK_HOLD_MS)
    return () => clearTimeout(t)
  }, [landed])
  return (
    <div className="space-y-5">
      {!rolled && <Roulette winner={album} pool={pool} seed={round.id} spinKey={round.spin} skip={skip} onDone={() => setLanded(true)} />}
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
  const seen = useRef(members.length)

  const active = round && round.status !== 'done' ? round : null
  const participants = members.filter((m) => active?.participants.includes(m.id))
  const myChoice = me && choices.find((c) => c.member_id === me.id)
  const readyCount = participants.filter((m) => choices.find((c) => c.member_id === m.id)?.ready).length
  const votedCount = participants.filter((m) => choices.find((c) => c.member_id === m.id)?.voted).length
  const allReady = participants.length >= 2 && readyCount === participants.length
  const allVoted = participants.length > 0 && votedCount === participants.length
  const leaderMember = members.find((m) => m.user_id === group.leader_id)
  // gerir o grupo só antes de escolher as bandas; no sorteio a seção some, e nas escolhas/votação vira só leitura
  const manage = !active
  const showPeople = active?.status !== 'drawing'
  const col2 = showPeople ? 'lg:col-start-2' : 'lg:col-start-1'
  const leaderStale = !isLeader && (!leaderMember || Date.now() - new Date(leaderMember.last_seen).getTime() > 7 * 86_400_000)

  // alguém entrou: um toque de aviso (a lista inicial não conta)
  useEffect(() => {
    if (members.length > seen.current) sfx.join()
    seen.current = members.length
  }, [members.length])

  // todos votaram: o líder encerra sozinho (o servidor sorteia o desempate)
  useEffect(() => {
    if (isLeader && active?.status === 'voting' && allVoted && !closing.current) {
      closing.current = true
      api.closeVote(active.id).catch(fail).finally(() => (closing.current = false))
    }
  }, [isLeader, active?.status, active?.id, allVoted])

  // o próximo passo de quem está olhando, em uma linha só
  const what = active?.mode === 'artist' ? 'suas bandas' : 'seus gêneros'
  const next = !active
    ? isLeader ? 'Inicie a rodada' : 'Aguardando o líder'
    : active.status === 'choosing'
      ? !(myChoice && active.participants.includes(me?.id ?? ''))
        ? 'Você entra na próxima rodada'
        : !myChoice.ready ? `Escolha ${what}`
        : allReady ? (isLeader ? (active.kind === 'vote' ? 'Inicie a votação' : 'Sorteie o álbum') : 'Aguardando o líder')
        : `Aguardando ${participants.length - readyCount} ${participants.length - readyCount === 1 ? 'pessoa' : 'pessoas'}`
      : active.status === 'drawing' ? 'Sorteio no ar'
      : choices.find((c) => c.member_id === me?.id)?.voted ? 'Aguardando os votos' : 'Vote em um álbum'
  const chipState = (id: string): MarkState => {
    const c = choices.find((x) => x.member_id === id)
    return active?.status === 'voting' ? (c?.voted ? 'done' : 'pending') : active?.status === 'drawing' ? 'done' : c?.ready ? 'done' : 'pending'
  }
  const progress = active?.status === 'voting' ? votedCount : active?.status === 'drawing' ? participants.length : readyCount

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
        sfx.error()
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
    if (lastfm.trim() && !(await lastfmUserExists(lastfm.trim()))) return fail(new Error('Usuário do Last.fm não encontrado.'))
    api.updateProfile(group.id, me.name, lastfm).then(() => toast.success('Perfil salvo'), fail)
  }

  if (!me) return null
  const lobbyRound = round?.status === 'done' ? round : null
  const winner = lobbyRound?.result?.album

  return (
    <main className="mx-auto max-w-6xl px-4 pb-14 pt-4 sm:pt-6">
      <Masthead>
        <SoundToggle />
      </Masthead>

      <header className="space-y-3 py-5 sm:py-6">
        <h1 className="break-words text-[clamp(3.5rem,16vw,6rem)]">{group.name}</h1>
        <Agora text={next}>
          {active && (
            <div className="flex items-center gap-2" role="img" aria-label={`${progress} de ${participants.length}`}>
              {participants.map((m) => (
                <Chip key={m.id} mine={m.id === me.id} initial={m.name[0]?.toUpperCase() ?? '?'} state={chipState(m.id)} />
              ))}
              <span className="tnum ml-2 text-lg font-bold">{progress}/{participants.length}</span>
            </div>
          )}
        </Agora>
      </header>

      <div className={cn('grid grid-cols-1 gap-8 lg:items-start lg:gap-x-10', showPeople ? 'lg:grid-cols-[minmax(0,23rem)_minmax(0,1fr)]' : 'lg:grid-cols-1')}>
        {showPeople && (
          <aside className="order-2 space-y-4 lg:order-none lg:col-start-1 lg:row-span-2 lg:row-start-1">
            <Section title={`Pessoas (${members.length}/6)`} hint={manage && isLeader ? 'Você é o líder: pode remover pessoas e passar a liderança.' : undefined}>
              <MemberList group={group} members={members} me={me} isLeader={isLeader} manage={manage} active={active} choices={active ? choices : []} />
              {manage && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => navigator.clipboard.writeText(`${location.origin}/g/${group.id}`).then(() => toast.success('Link do convite copiado'), () => toast.error('Não consegui copiar'))}
                  >
                    <Link2 /> Copiar convite
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => navigator.clipboard.writeText(group.id).then(() => toast.success('Código do grupo copiado'), () => toast.error('Não consegui copiar'))}
                  >
                    <KeyRound /> Copiar código
                  </Button>
                  {leaderStale && (
                    <Button variant="secondary" onClick={() => api.claimLeadership(group.id).then(refresh, fail)}>O líder sumiu há 7+ dias: assumir liderança</Button>
                  )}
                  <details className="text-sm">
                    <summary className="flex min-h-11 cursor-pointer items-center gap-2 font-semibold underline underline-offset-4"><LastfmIcon className="size-4" />Meu perfil{lastfmEnabled ? ' · Last.fm' : ''}</summary>
                    {lastfmEnabled ? (
                      <form onSubmit={saveProfile} className="mt-1 flex gap-2">
                        <Input value={lastfm} onChange={(e) => setLastfm(e.target.value)} placeholder="Usuário do Last.fm (evita álbuns que você já ouviu)" aria-label="Usuário do Last.fm" maxLength={40} />
                        <Button type="submit" variant="outline"><LastfmIcon /> Salvar</Button>
                      </form>
                    ) : (
                      <p className="mt-1 text-muted-foreground">O filtro de álbuns já escutados precisa de uma chave da API do Last.fm (VITE_LASTFM_KEY).</p>
                    )}
                  </details>
                </>
              )}
            </Section>
          </aside>
        )}

        <div className={cn('order-1 space-y-8 lg:order-none lg:row-start-1', col2)}>
          {/* ---------- sem rodada ativa */}
          {!active && (
            <Section title={isLeader ? 'Nova rodada' : 'Aguardando o líder'} hint={isLeader ? 'Cada um escolhe até 5 e o sistema cuida do resto.' : 'O líder vai iniciar a próxima rodada.'}>
              {lobbyRound && winner && (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">Última rodada ({lobbyRound.kind === 'vote' ? 'votação' : 'sorteio'}):</p>
                  <AlbumCard album={winner} />
                </div>
              )}
              {isLeader && (
                <Card className="gap-5 p-4 sm:p-5">
                  <div className="grid gap-4 xl:grid-cols-2">
                    <div className="space-y-2">
                      <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Escolher por</p>
                      <Segmented label="Escolher por" value={mode} onChange={setMode} options={[{ v: 'artist', label: 'Bandas/artistas', icon: <Mic className="size-4" /> }, { v: 'genre', label: 'Gêneros', icon: <Tags className="size-4" /> }]} />
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Decidir por</p>
                      <Segmented label="Decidir por" value={kind} onChange={setKind} options={[{ v: 'draw', label: 'Sorteio', icon: <Shuffle className="size-4" /> }, { v: 'vote', label: 'Votação', icon: <Vote className="size-4" /> }]} />
                    </div>
                  </div>
                  <Button size="lg" disabled={members.length < 2} onClick={() => api.startRound(group.id, mode, kind).then(refresh, fail)}>
                    <Disc3 /> {members.length < 2 ? 'Convide pelo menos mais 1 pessoa' : 'Iniciar rodada'}
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
                      <Button variant="outline" size="lg" disabled={!!busy} onClick={() => run(active)}>
                        {busy ? <><Loader2 className="animate-spin" /> {busy}</> : <><RotateCcw /> Sortear de novo</>}
                      </Button>
                      <Button variant="ghost" size="lg" onClick={() => api.backToChoosing(active.id).then(refresh, fail)}><Undo2 /> Voltar às escolhas</Button>
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
                <Button variant="outline" onClick={() => api.closeVote(active.id).catch(fail)}><CircleCheck /> Encerrar votação agora</Button>
              )}
            </Section>
          )}

        </div>

        <div className={cn('order-3 lg:order-none lg:row-start-2', col2)}>
          <Section title="Já ouvimos" hint="Nunca mais entram nos sorteios deste grupo.">
            <HistoryList items={history} />
          </Section>
        </div>
      </div>
    </main>
  )
}
