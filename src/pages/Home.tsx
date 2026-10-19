import { AnimatePresence, motion } from 'motion/react'
import { ArrowLeft, ArrowRight, Disc3, KeyRound } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { LastfmIcon } from '@/components/Brand'
import { BRAND, Masthead, SoundToggle, TarjaBand } from '@/components/Guide'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { api } from '@/lib/api'
import { lastfmEnabled, lastfmUserExists } from '@/lib/lastfm'
import { sfx } from '@/lib/sound'
import { cn } from '@/lib/utils'

const KEY = 'album-sort:groups'
export const savedGroups = (): { id: string; name: string }[] => {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]')
  } catch {
    return []
  }
}
export const rememberGroup = (id: string, name: string) => {
  try {
    localStorage.setItem(KEY, JSON.stringify([{ id, name }, ...savedGroups().filter((g) => g.id !== id)].slice(0, 12)))
  } catch {
    /* storage bloqueado: só perde a lista de atalhos */
  }
}

// o código do grupo é o id dele (o mesmo do link de convite): aceita o código puro ou o link colado
const GROUP_CODE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i

type View = 'start' | 'create' | 'join'
const EASE = [0.22, 1, 0.36, 1] as const
const rise = (delay: number) => ({ initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.5, delay, ease: EASE } })

// hover vermelho nos dois botões da entrada (o vermelho de "você")
const START_BTN = 'w-full sm:w-auto sm:min-w-52 hover:border-you hover:bg-you hover:text-you-ink'

export default function Home() {
  const nav = useNavigate()
  const [view, setView] = useState<View>('start')
  const [group, setGroup] = useState('')
  const [name, setName] = useState('')
  const [lastfm, setLastfm] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const mine = savedGroups()

  async function create(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    try {
      if (lastfm.trim() && !(await lastfmUserExists(lastfm.trim()))) throw new Error('Usuário do Last.fm não encontrado.')
      const id = await api.createGroup(group, name, lastfm)
      rememberGroup(id, group.trim())
      nav(`/g/${id}`)
    } catch (err) {
      sfx.error()
      toast.error(err instanceof Error ? err.message : 'Não consegui criar o grupo')
      setBusy(false)
    }
  }

  async function join(e: React.FormEvent) {
    e.preventDefault()
    const id = code.match(GROUP_CODE)?.[0].toLowerCase()
    setBusy(true)
    try {
      if (!id || !(await api.preview(id))) throw new Error('Código não encontrado. Confira com quem criou o grupo.')
      nav(`/g/${id}`)
    } catch (err) {
      sfx.error()
      toast.error(err instanceof Error ? err.message : 'Não consegui entrar no grupo')
      setBusy(false)
    }
  }

  const back = (
    <Button type="button" variant="ghost" size="sm" className="-ml-3 self-start" onClick={() => setView('start')}>
      <ArrowLeft /> Voltar
    </Button>
  )

  return (
    <main className="mx-auto max-w-6xl px-4 pb-14 pt-4 sm:pt-6">
      <Masthead>
        <SoundToggle />
      </Masthead>

      <section className="grid gap-6 py-8 sm:py-12 md:grid-cols-[auto_minmax(0,26rem)] md:items-end md:justify-between md:gap-12">
        <motion.h1 {...rise(0)} className="text-[clamp(3.6rem,17vw,6rem)]">{BRAND}</motion.h1>
        <motion.p {...rise(0.12)} className="text-lg font-medium leading-snug">
          Monte um grupo com os amigos, cada um joga suas bandas ou gêneros favoritos e a roleta escolhe o álbum que todo mundo escuta, discute e descobre junto.
        </motion.p>
      </section>
      <TarjaBand />

      <AnimatePresence mode="wait" initial={false}>
        {view === 'start' ? (
          <motion.div key="start" exit={{ opacity: 0, y: -8, transition: { duration: 0.15 } }} className="mt-10 space-y-10">
            <motion.div {...rise(0.3)} className="flex flex-col gap-3 sm:flex-row">
              <Button size="lg" className={START_BTN} onClick={() => setView('create')}>
                <Disc3 className="transition-transform duration-500 ease-out group-hover/button:rotate-180" /> Criar grupo
              </Button>
              <Button size="lg" variant="outline" className={START_BTN} onClick={() => setView('join')}>
                <KeyRound className="transition-transform duration-300 ease-out group-hover/button:-rotate-12" /> Entrar em um grupo
              </Button>
            </motion.div>
            {mine.length > 0 && <SavedGroups items={mine} />}
          </motion.div>
        ) : (
          <motion.div key={view} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, transition: { duration: 0.12 } }} transition={{ duration: 0.4, ease: EASE }} className={cn('mt-10 grid gap-10', mine.length > 0 && 'md:grid-cols-2 md:gap-12')}>
            {view === 'create' ? (
              <form onSubmit={create}>
                <Card className="gap-3 rounded-none border-t-[6px] p-5">
                  {back}
                  <h2 className="text-3xl">Criar grupo</h2>
                  <Input aria-label="Nome do grupo" placeholder="Nome do grupo" value={group} onChange={(e) => setGroup(e.target.value)} maxLength={40} required autoFocus />
                  <Input aria-label="Seu nome" placeholder="Seu nome" value={name} onChange={(e) => setName(e.target.value)} maxLength={24} required />
                  {lastfmEnabled && (
                    <div className="relative">
                      <LastfmIcon className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2" />
                      <Input className="pl-11" aria-label="Usuário do Last.fm" placeholder="Usuário do Last.fm (opcional)" value={lastfm} onChange={(e) => setLastfm(e.target.value)} maxLength={40} />
                    </div>
                  )}
                  <Button type="submit" size="lg" disabled={busy || !group.trim() || !name.trim()}>
                    <Disc3 className={busy ? 'animate-spin' : ''} /> {busy ? 'Criando…' : 'Criar e convidar amigos'}
                  </Button>
                </Card>
              </form>
            ) : (
              <form onSubmit={join}>
                <Card className="gap-3 rounded-none border-t-[6px] p-5">
                  {back}
                  <h2 className="text-3xl">Entrar em um grupo</h2>
                  <p className="text-sm text-muted-foreground">Cole o código que o grupo gerou (a pessoa que criou encontra em “Copiar código”). O link do convite também vale.</p>
                  <Input aria-label="Código do grupo" placeholder="Código do grupo" value={code} onChange={(e) => setCode(e.target.value)} autoComplete="off" autoCapitalize="none" spellCheck={false} required autoFocus />
                  <Button type="submit" size="lg" disabled={busy || !code.trim()}>
                    <KeyRound /> {busy ? 'Procurando…' : 'Entrar no grupo'}
                  </Button>
                </Card>
              </form>
            )}
            {mine.length > 0 && <SavedGroups items={mine} />}
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  )
}

function SavedGroups({ items }: { items: { id: string; name: string }[] }) {
  return (
    <section aria-label="Seus grupos" className="space-y-3 border-t-[3px] border-foreground pt-3">
      <h2 className="text-3xl">Seus grupos</h2>
      <ul className="box divide-y divide-foreground/20 overflow-hidden">
        {items.map((g, i) => (
          <motion.li key={g.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.35, delay: 0.1 + i * 0.05, ease: EASE }}>
            <Link to={`/g/${g.id}`} className="group/row flex min-h-14 items-center justify-between gap-3 bg-card px-4 py-2 text-lg font-bold transition-colors hover:bg-muted">
              <span className="truncate">{g.name}</span>
              <ArrowRight className="size-5 shrink-0 transition-transform duration-200 group-hover/row:translate-x-1" />
            </Link>
          </motion.li>
        ))}
      </ul>
    </section>
  )
}
