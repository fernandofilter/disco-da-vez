import { motion } from 'motion/react'
import { CircleCheck, Dices, Disc3, History, KeyRound, Link2, Loader2, Mic, RotateCcw, Shuffle, Tags, Trash2, Undo2, Vote } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import type { GroupState } from '@/hooks/useGroup'
import { api } from '@/lib/api'
import { drawAlbums } from '@/lib/albums'
import { sfx } from '@/lib/sound'
import type { Album, Kind, Mode, Round } from '@/lib/types'
import { cn } from '@/lib/utils'
import { AlbumCard } from './AlbumCard'
import { AlbumIcon } from './Brand'
import { ChoicePicker } from './ChoicePicker'
import { Agora, Chip, Masthead, Segmented, SoundToggle, Stages, Footer } from './Guide'
import type { MarkState } from './Guide'
import { forgetGroup } from '@/lib/groups'
import { inviteMessage } from '@/lib/invite'
import { MemberList } from './MemberList'
import { PushToggle } from './PushToggle'
import { albumDetails, albumSides, artistAlbums } from '@/lib/musicbrainz'
import { previews } from '@/lib/preview'
import { Garimpo } from './Garimpo'
import { Roulette } from './Roulette'
import { VotePanel } from './VotePanel'
import { Button } from './ui/button'
import { Card } from './ui/card'

const fail = (e: Error) => {
  sfx.error()
  toast.error(e.message)
}
const SKIP_AFTER_MS = 14_000 // a fita dura 11 s e segura o vencedor por mais um pouco
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
export function Reveal({ round, album, pool, hint, children }: { round: Pick<Round, 'id' | 'spin' | 'result_at'>; album?: Album; pool: Album[]; hint?: string; children: (rolled: boolean) => React.ReactNode }) {
  const [first] = useState(round.spin)
  const [initialAge] = useState(() => (round.result_at ? Date.now() - new Date(round.result_at).getTime() : 0))
  const skip = round.spin === first && initialAge > SKIP_AFTER_MS
  const [landed, setLanded] = useState(skip) // a fita parou
  const [rolled, setRolled] = useState(skip) // a fita saiu de cena
  useEffect(() => {
    setLanded(skip)
    setRolled(skip)
  }, [round.spin, skip])
  // enquanto a fita gira já busca faixas e prévias: o card aparece pronto quando ela parar
  const albumId = album?.id
  useEffect(() => {
    if (!album) return
    albumDetails(album.id).catch(() => {})
    albumSides(album.id).catch(() => {})
    previews(album).catch(() => {})
  }, [albumId]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!landed) return
    const t = setTimeout(() => setRolled(true), LOCK_HOLD_MS)
    const w = skip ? undefined : setTimeout(sfx.win, 450) // quem chegou depois do fim não ouve a fanfarra
    return () => {
      clearTimeout(t)
      clearTimeout(w)
    }
  }, [landed, skip])
  return (
    <div className="space-y-5">
      {!album && <Garimpo hint={hint} />}
      {album && !rolled && <Roulette winner={album} pool={pool} seed={round.id} spinKey={round.spin} skip={skip} onDone={() => setLanded(true)} />}
      {rolled && album && <AlbumCard album={album} />}
      {children(rolled && !!album)}
    </div>
  )
}

export function GroupView({ data, refresh }: { data: GroupState; refresh: () => void }) {
  const { group, members, me, round, rounds, choices, votes, history, userId } = data
  const isLeader = group.leader_id === userId
  const [mode, setMode] = useState<Mode>(group.last_mode)
  const [kind, setKind] = useState<Kind>(group.last_kind)
  const [busy, setBusy] = useState(false) // a busca dos álbuns está rolando (só no celular do líder)
  const nav = useNavigate()
  const [sure, setSure] = useState(false) // confirmação de excluir o grupo
  const [undo, setUndo] = useState('') // confirmação de voltar às escolhas com a votação aberta (vale só para esta abertura: id/spin)
  const [rolls, setRolls] = useState(0)
  const closing = useRef(false)
  const seen = useRef(members.length)

  const active = round && round.status !== 'done' ? round : null
  const participants = members.filter((m) => active?.participants.includes(m.id))
  // quem entrou com o sorteio/votação já rolando: assiste até o líder reabrir as escolhas
  const late = active ? members.filter((m) => !active.participants.includes(m.id)) : []
  const myChoice = me && choices.find((c) => c.member_id === me.id)
  const inRound = !!myChoice && !!active?.participants.includes(myChoice.member_id)
  const lateNote = 'Você entrou em uma rodada em andamento: participa da próxima, ou quando o líder reabrir as escolhas.'
  const lateWaiting = late.length > 0 && (
    <p className="text-sm font-semibold">
      {new Intl.ListFormat('pt-BR').format(late.map((m) => m.name))} {late.length === 1 ? 'entrou depois e está esperando' : 'entraram depois e estão esperando'}: volte às escolhas para incluir.
    </p>
  )
  const readyCount = participants.filter((m) => choices.find((c) => c.member_id === m.id)?.ready).length
  const votedCount = participants.filter((m) => choices.find((c) => c.member_id === m.id)?.voted).length
  const allReady = participants.length >= 2 && readyCount === participants.length
  const allVoted = participants.length > 0 && votedCount === participants.length
  const leaderMember = members.find((m) => m.user_id === group.leader_id)
  // cada etapa é uma tela: as pessoas (e a gestão do grupo) só aparecem antes e durante as escolhas; sorteio e votação ocupam a tela inteira
  const showPeople = !active || active.status === 'choosing'
  const manage = showPeople
  const col2 = showPeople ? 'lg:col-start-2' : 'lg:col-start-1'
  // número da rodada (#1, #2…): a que está rolando, ou a próxima quando nada está rolando
  const total = rounds.length
  const nextNo = total + 1
  const stage = active ? (active.status === 'choosing' ? 1 : 2) : total > 0 ? 3 : 0
  const leaderStale = !isLeader && (!leaderMember || Date.now() - new Date(leaderMember.last_seen).getTime() > 7 * 86_400_000)

  // o líder já aquece as discografias das bandas escolhidas enquanto o grupo escolhe: na hora de sortear elas estão em cache
  const picks = active?.mode === 'artist' && isLeader ? choices.flatMap((c) => c.items) : []
  const picksKey = picks.map((c) => c.id).join()
  useEffect(() => {
    picks.forEach((c) => artistAlbums(c).catch(() => {}))
  }, [picksKey]) // eslint-disable-line react-hooks/exhaustive-deps

  // trocou de etapa: a nova tela começa no topo
  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [round?.id, round?.status])

  // a votação fechou sem roleta (sem empate): a fanfarra do vencedor
  const prevStatus = useRef(round?.status)
  useEffect(() => {
    if (prevStatus.current === 'voting' && round?.status === 'done' && !((round.result?.tied?.length ?? 0) > 1)) sfx.win()
    prevStatus.current = round?.status
  }, [round?.status]) // eslint-disable-line react-hooks/exhaustive-deps

  // alguém entrou: um toque de aviso (a lista inicial não conta)
  useEffect(() => {
    if (members.length > seen.current) sfx.join()
    seen.current = members.length
  }, [members.length])

  // todos votaram: encerra sozinho (o servidor sorteia o desempate). O líder encerra; quem votou também, para a votação
  // não ficar parada esperando um líder que fechou o navegador (o primeiro fecha, os outros recebem round_locked e ignoram)
  useEffect(() => {
    if ((isLeader || inRound) && active?.status === 'voting' && active.candidates && allVoted && !closing.current) {
      closing.current = true
      api.closeVote(active.id).catch(isLeader ? fail : () => {}).finally(() => (closing.current = false))
    }
  }, [isLeader, inRound, active?.status, active?.id, active?.candidates, allVoted])

  // o próximo passo de quem está olhando, em uma linha só
  const what = active?.mode === 'artist' ? 'suas bandas' : active?.mode === 'album' ? 'seus álbuns' : 'seus gêneros'
  const next = !active
    ? isLeader ? `Inicie a rodada #${nextNo}` : 'Aguardando o líder'
    : !inRound ? 'Você entra na próxima rodada'
    : active.status === 'choosing'
      ? !myChoice.ready ? `Escolha ${what}`
        : allReady ? (isLeader ? (active.kind === 'vote' ? 'Inicie a votação' : 'Sorteie o álbum') : 'Aguardando o líder')
        : `Aguardando ${participants.length - readyCount} ${participants.length - readyCount === 1 ? 'pessoa' : 'pessoas'}`
      : active.status === 'drawing' ? 'Sorteio no ar'
      : choices.find((c) => c.member_id === me?.id)?.voted ? 'Aguardando os votos' : 'Vote em um álbum'
  const chipState = (id: string): MarkState => {
    const c = choices.find((x) => x.member_id === id)
    return active?.status === 'voting' ? (c?.voted ? 'done' : 'pending') : active?.status === 'drawing' ? 'done' : c?.ready ? 'done' : 'pending'
  }
  const progress = active?.status === 'voting' ? votedCount : active?.status === 'drawing' ? participants.length : readyCount

  /** O servidor abre a dinâmica na hora (todos veem a fita/slots girando) e a busca dos álbuns acontece enquanto ela rola. */
  async function run(r: Round) {
    const vote = r.kind === 'vote'
    setBusy(true)
    try {
      await api.beginDeal(r.id)
      refresh()
      const { albums, filler } = await drawAlbums({
        mode: r.mode,
        members: participants,
        choices: Object.fromEntries(choices.map((c) => [c.member_id, c.items])),
        historyIds: history.map((h) => h.album_id),
        count: vote ? 6 : 1,
      })
      if (albums.length < (vote ? 2 : 1)) {
        sfx.error()
        toast.error('Não achei álbuns suficientes com essas escolhas (histórico ou sem capa). Troquem algumas escolhas.')
        return await api.backToChoosing(r.id)
      }
      if (vote) {
        if (albums.length < 6) toast.info(`Só consegui ${albums.length} álbuns para a votação.`)
        await api.publishVote(r.id, albums, filler)
      } else {
        await api.publishDraw(r.id, { album: albums[0], filler })
      }
    } catch (e) {
      fail(e as Error)
      api.backToChoosing(r.id).catch(() => {}) // não deixa a rodada presa na animação
    } finally {
      setBusy(false)
    }
  }

  /** Líder com a busca parada (recarregou a página no meio): tentar de novo ou desistir. */
  const stuck = (r: Round) =>
    isLeader && !busy ? (
      <div className="grid grid-cols-[repeat(auto-fit,minmax(13.5rem,1fr))] gap-3">
        <Button size="lg" className="w-full" onClick={() => run(r)}><RotateCcw /> Tentar de novo</Button>
        <Button variant="outline" size="lg" className="w-full" onClick={() => api.backToChoosing(r.id).then(refresh, fail)}><Undo2 /> Voltar às escolhas</Button>
      </div>
    ) : null

  /** Sorteia o jeito da rodada (sorteio ou votação, e bandas, gêneros ou álbuns) sempre diferente do que já está marcado. */
  function shuffleSetup() {
    const other = <T,>(list: T[], current: T) => {
      const rest = list.filter((x) => x !== current)
      return rest[Math.floor(Math.random() * rest.length)]
    }
    setKind(other<Kind>(['draw', 'vote'], kind))
    setMode(other<Mode>(['artist', 'genre', 'album'], mode))
    setRolls((n) => n + 1)
    sfx.click()
  }

  if (!me) return null
  const lobbyRound = round?.status === 'done' ? round : null
  const winner = lobbyRound?.result?.album
  const tied = lobbyRound?.kind === 'vote' ? lobbyRound.result?.tied : undefined

  return (
    <main className="mx-auto max-w-6xl px-4 pb-14 pt-4 sm:pt-6">
      <Masthead>
        <div className="flex items-center gap-2">
          <Link
            to={`/g/${group.id}/historico`}
            aria-label="Histórico de rodadas"
            className="inline-flex h-11 items-center gap-2 rounded border-[1.5px] border-foreground bg-card px-3 text-sm font-semibold transition-colors hover:bg-muted"
          >
            <History className="size-5 sm:size-4" />
            <span className="hidden sm:inline">Histórico</span>
            {history.length > 0 && <span className="tnum hidden sm:inline">({history.length})</span>}
          </Link>
          {me && <PushToggle gid={group.id} memberId={me.id} />}
          <SoundToggle />
        </div>
      </Masthead>

      <header className="space-y-4 py-5 sm:py-6">
        <h1 className="break-words text-[clamp(2.25rem,9vw,3.75rem)]">{group.name}</h1>
        <Stages round={Math.max(total, 1)} current={stage} />
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
          <aside className="order-2 space-y-4 lg:order-none lg:col-start-1 lg:row-start-1">
            <Section title={`Pessoas (${members.length}/6)`} hint={manage && isLeader ? 'Você é o líder: pode remover pessoas e passar a liderança.' : undefined}>
              <MemberList group={group} members={members} me={me} isLeader={isLeader} manage={manage} active={active} choices={active ? choices : []} />
              {manage && (
                <>
                  {/* colunas de largura igual; sem espaço lado a lado, empilham sem quebrar o texto */}
                  <div className="grid grid-cols-[repeat(auto-fit,minmax(10.5rem,1fr))] gap-3">
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => navigator.clipboard.writeText(inviteMessage(location.origin, group.id, group.name)).then(() => toast.success('Convite copiado'), () => toast.error('Não consegui copiar'))}
                    >
                      <Link2 /> Copiar convite
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => navigator.clipboard.writeText(group.id).then(() => toast.success('Código do grupo copiado'), () => toast.error('Não consegui copiar'))}
                    >
                      <KeyRound /> Copiar código
                    </Button>
                  </div>
                  {leaderStale && (
                    <Button variant="secondary" onClick={() => api.claimLeadership(group.id).then(refresh, fail)}>O líder sumiu há 7+ dias: assumir liderança</Button>
                  )}
                  {isLeader && (
                    <div className="flex flex-wrap items-center gap-2">
                      {sure ? (
                        <>
                          <p className="w-full text-sm font-semibold">Apagar “{group.name}” e todo o histórico, para todos?</p>
                          <Button variant="destructive" size="sm" onClick={() => api.deleteGroup(group.id).then(() => { forgetGroup(group.id); nav('/') }, fail)}><Trash2 /> Sim, excluir grupo</Button>
                          <Button variant="outline" size="sm" onClick={() => setSure(false)}>Cancelar</Button>
                        </>
                      ) : (
                        <Button variant="outline" size="sm" onClick={() => setSure(true)}><Trash2 /> Excluir grupo</Button>
                      )}
                    </div>
                  )}
                </>
              )}
            </Section>
          </aside>
        )}

        <div className={cn('order-1 space-y-8 lg:order-none lg:row-start-1', col2)}>
          {/* ---------- sem rodada ativa */}
          {!active && (
            <Section title={isLeader ? 'Nova rodada' : 'Aguardando o líder'} hint={isLeader ? 'Escolha como a rodada vai rolar. Depois cada um escolhe até 5 e o sistema cuida do resto.' : `O líder vai iniciar a rodada #${nextNo}.`}>
              {lobbyRound && winner && (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Rodada #{total} ({lobbyRound.kind === 'vote' ? 'votação' : 'sorteio'}{tied && tied.length > 1 ? `, empate entre ${tied.length}` : ''}): o álbum da vez
                  </p>
                  {tied && tied.length > 1 ? <Reveal round={lobbyRound} album={winner} pool={tied}>{() => null}</Reveal> : <AlbumCard album={winner} />}
                </div>
              )}
              {isLeader && (
                <Card className="gap-5 p-4 sm:p-5">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Decidir por</p>
                      <Segmented label="Decidir por" value={kind} onChange={setKind} options={[{ v: 'draw', label: 'Sorteio', icon: <Shuffle className="size-4" /> }, { v: 'vote', label: 'Votação', icon: <Vote className="size-4" /> }]} />
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Escolher por</p>
                      <Segmented label="Escolher por" value={mode} onChange={setMode} options={[{ v: 'artist', label: 'Bandas/artistas', icon: <Mic className="size-4" /> }, { v: 'genre', label: 'Gêneros', icon: <Tags className="size-4" /> }, { v: 'album', label: 'Álbuns', icon: <AlbumIcon className="size-4" /> }]} />
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Button size="lg" className="min-w-0 flex-1" disabled={members.length < 2} onClick={() => api.startRound(group.id, mode, kind).then(refresh, fail)}>
                      <Disc3 /> {members.length < 2 ? 'Convide pelo menos mais 1 pessoa' : `Iniciar rodada #${nextNo}`}
                    </Button>
                    <Button size="icon-lg" variant="outline" aria-label="Sortear as opções da rodada" title="Sortear as opções da rodada" onClick={shuffleSetup}>
                      <Dices className="size-6 transition-transform duration-500 ease-out" style={{ transform: `rotate(${rolls * 180}deg)` }} />
                    </Button>
                  </div>
                </Card>
              )}
            </Section>
          )}

          {/* ---------- escolhas */}
          {active?.status === 'choosing' && (
            <Section title={active.mode === 'artist' ? 'Escolha suas bandas/artistas' : active.mode === 'album' ? 'Escolha seus álbuns' : 'Escolha seus gêneros'} hint={`Rodada #${total} · ${active.kind === 'vote' ? 'Votação' : 'Sorteio'} · de 1 a 5 escolhas`}>
              {myChoice && inRound ? (
                <Card className="p-4"><ChoicePicker roundId={active.id} mode={active.mode} initial={myChoice.items} ready={myChoice.ready} /></Card>
              ) : (
                <p className="text-muted-foreground">{lateNote}</p>
              )}
              {isLeader && (
                <Button size="lg" disabled={!allReady || busy} onClick={() => run(active)}>
                  {busy ? <Loader2 className="animate-spin" /> : allReady ? (active.kind === 'vote' ? <><Vote /> Iniciar votação</> : <><Shuffle /> Sortear álbum</>) : 'Aguardando todos confirmarem…'}
                </Button>
              )}
            </Section>
          )}

          {/* ---------- sorteio em andamento */}
          {active?.status === 'drawing' && (
            <Section title="Sorteio" hint={`Rodada #${total}`}>
              {!inRound && <p className="text-muted-foreground">{lateNote}</p>}
              <Reveal round={active} album={active.result?.album} pool={active.result?.filler ?? []}>
                {(rolled) =>
                  rolled && isLeader ? (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                      {lateWaiting}
                      <div className="grid grid-cols-[repeat(auto-fit,minmax(13.5rem,1fr))] gap-3">
                        <Button size="lg" className="w-full" onClick={() => api.confirmDraw(active.id).then(refresh, fail)}><CircleCheck /> Vamos ouvir esse</Button>
                        <Button variant="outline" size="lg" className="w-full" disabled={busy} onClick={() => run(active)}>
                          {busy ? <Loader2 className="animate-spin" /> : <RotateCcw />} Sortear de novo
                        </Button>
                        <Button variant="outline" size="lg" className="w-full" onClick={() => api.backToChoosing(active.id).then(refresh, fail)}><Undo2 /> Voltar às escolhas</Button>
                      </div>
                    </motion.div>
                  ) : rolled ? (
                    <p className="text-sm text-muted-foreground">Aguardando o líder confirmar ou sortear de novo…</p>
                  ) : !active.result ? (
                    stuck(active)
                  ) : null
                }
              </Reveal>
            </Section>
          )}

          {/* ---------- votação */}
          {active?.status === 'voting' && (
            <Section title="Votação" hint={`Rodada #${total} · seu voto é secreto até todos votarem. Dá para trocar antes de encerrar.`}>
              {!inRound && <p className="text-muted-foreground">{lateNote}</p>}
              <VotePanel roundId={active.id} candidates={active.candidates} filler={(active.result as { filler?: Album[] } | null)?.filler} reveal={active.mode !== 'album'} myVote={votes.find((v) => v.member_id === me.id)?.album_id} watch={!inRound} />
              {!active.candidates && stuck(active)}
              {isLeader && active.candidates && !allVoted && (
                <div className="space-y-3">
                  {lateWaiting}
                  {undo === `${active.id}/${active.spin}` ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="w-full text-sm font-semibold">Voltar às escolhas? Os votos já dados serão apagados.</p>
                      <Button variant="destructive" size="sm" onClick={() => api.backToChoosing(active.id).then(refresh, fail)}><Undo2 /> Sim, voltar às escolhas</Button>
                      <Button variant="outline" size="sm" onClick={() => setUndo('')}>Cancelar</Button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-[repeat(auto-fit,minmax(13.5rem,1fr))] gap-3">
                      <Button variant="outline" className="w-full" onClick={() => api.closeVote(active.id).catch(fail)}><CircleCheck /> Encerrar votação agora</Button>
                      <Button variant="outline" className="w-full" onClick={() => setUndo(`${active.id}/${active.spin}`)}><Undo2 /> Voltar às escolhas</Button>
                    </div>
                  )}
                </div>
              )}
            </Section>
          )}

        </div>
      </div>
      <Footer />
    </main>
  )
}
