import { AnimatePresence, motion } from 'motion/react'
import { ArrowLeft, Disc3, Headphones, KeyRound, Mic, Shuffle, User, Users } from 'lucide-react'
import { lazy, Suspense, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { BRAND, Masthead, SoundToggle, Footer } from '@/components/Guide'
import { SavedGroups } from '@/components/SavedGroups'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { api } from '@/lib/api'
import { rememberGroup } from '@/lib/groups'
import { sfx } from '@/lib/sound'

// o código do grupo é o id dele (o mesmo do link de convite): aceita o código puro ou o link colado
const GROUP_CODE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i

// three.js só carrega na tela inicial, depois do primeiro desenho
const Vinyl = lazy(() => import('@/components/Vinyl'))

type View = 'start' | 'friends' | 'create' | 'join'
const EASE = [0.22, 1, 0.36, 1] as const
const rise = (delay: number) => ({ initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.5, delay, ease: EASE } })

// hover vermelho nos dois botões da entrada (o vermelho de "você")
const START_BTN = 'w-full sm:w-auto sm:min-w-52 hover:border-you hover:bg-you hover:text-you-ink'

export default function Home() {
  const nav = useNavigate()
  const [view, setView] = useState<View>('start')
  const [group, setGroup] = useState('')
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)

  async function create(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    try {
      const id = await api.createGroup(group, name)
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

  const back = (to: View) => (
    <Button type="button" variant="ghost" size="sm" className="-ml-3 self-start" onClick={() => setView(to)}>
      <ArrowLeft /> Voltar
    </Button>
  )

  return (
    <main className="mx-auto max-w-6xl px-4 pb-14 pt-4 sm:pt-6">
      <Masthead>
        <SoundToggle />
      </Masthead>

      <section className="grid items-center gap-4 py-6 sm:py-10 md:grid-cols-[minmax(0,1fr)_minmax(0,30rem)] md:gap-10">
        <div className="space-y-6">
          <motion.h1 {...rise(0)} className="text-[clamp(3.6rem,17vw,6rem)]">{BRAND}</motion.h1>
          <motion.p {...rise(0.12)} className="max-w-[26rem] text-lg font-medium leading-snug">
            Monte um grupo com os amigos, cada um joga suas bandas ou gêneros favoritos e a roleta escolhe o álbum que todo mundo escuta, discute e descobre junto.
          </motion.p>
        </div>
        <motion.div {...rise(0.2)} aria-hidden className="relative aspect-[5/4] w-full">
          {/* disco vermelho impresso em meio-tom: a cor da página, atrás do vinil */}
          {/* no celular o disco fica no centro, onde o vinil e a capa se equilibram; de md em diante vai para a direita */}
          <div className="halftone absolute left-1/2 top-1/2 aspect-square h-[92%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-you after:rounded-full md:left-auto md:right-[4%] md:translate-x-0" />
          <Suspense fallback={null}>
            <Vinyl />
          </Suspense>
        </motion.div>
      </section>

      <AnimatePresence mode="wait" initial={false}>
        {view === 'start' ? (
          <motion.div key="start" exit={{ opacity: 0, y: -8, transition: { duration: 0.15 } }} className="mt-10 space-y-10">
            <motion.div {...rise(0.3)} className="flex flex-col gap-3 sm:flex-row">
              <Button size="lg" className={START_BTN} onClick={() => setView('friends')}>
                <Users className="transition-transform duration-300 ease-out group-hover/button:scale-110" /> Jogar com amigos
              </Button>
              <Button size="lg" variant="outline" className={START_BTN} onClick={() => nav('/solo')}>
                <User className="transition-transform duration-300 ease-out group-hover/button:scale-110" /> Jogar sozinho
              </Button>
            </motion.div>
            <Steps />
          </motion.div>
        ) : (
          <motion.div key={view} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, transition: { duration: 0.12 } }} transition={{ duration: 0.4, ease: EASE }} className="mt-10 max-w-xl">
            {view === 'friends' ? (
              <Card className="gap-3 rounded-none border-t-[6px] p-5">
                {back('start')}
                <h2 className="text-3xl">Jogar com amigos</h2>
                <SavedGroups />
                <Button size="lg" className="w-full hover:border-you hover:bg-you hover:text-you-ink" onClick={() => setView('create')}>
                  <Disc3 className="transition-transform duration-500 ease-out group-hover/button:rotate-180" /> Criar grupo
                </Button>
                <Button size="lg" variant="outline" className="w-full hover:border-you hover:bg-you hover:text-you-ink" onClick={() => setView('join')}>
                  <KeyRound className="transition-transform duration-300 ease-out group-hover/button:-rotate-12" /> Entrar em um grupo
                </Button>
              </Card>
            ) : view === 'create' ? (
              <form onSubmit={create}>
                <Card className="gap-3 rounded-none border-t-[6px] p-5">
                  {back('friends')}
                  <h2 className="text-3xl">Criar grupo</h2>
                  <Input aria-label="Nome do grupo" placeholder="Nome do grupo" value={group} onChange={(e) => setGroup(e.target.value)} maxLength={40} required autoFocus />
                  <Input aria-label="Seu nome" placeholder="Seu nome" value={name} onChange={(e) => setName(e.target.value)} maxLength={24} required />
                  <Button type="submit" size="lg" disabled={busy || !group.trim() || !name.trim()}>
                    <Disc3 className={busy ? 'animate-spin' : ''} /> {busy ? 'Criando…' : 'Criar e convidar amigos'}
                  </Button>
                </Card>
              </form>
            ) : (
              <form onSubmit={join}>
                <Card className="gap-3 rounded-none border-t-[6px] p-5">
                  {back('friends')}
                  <h2 className="text-3xl">Entrar em um grupo</h2>
                  <p className="text-sm text-muted-foreground">Cole o código que o grupo gerou (a pessoa que criou encontra em “Copiar código”). O link do convite também vale.</p>
                  <Input aria-label="Código do grupo" placeholder="Código do grupo" value={code} onChange={(e) => setCode(e.target.value)} autoComplete="off" autoCapitalize="none" spellCheck={false} required autoFocus />
                  <Button type="submit" size="lg" disabled={busy || !code.trim()}>
                    <KeyRound /> {busy ? 'Procurando…' : 'Entrar no grupo'}
                  </Button>
                </Card>
              </form>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      <Footer />
    </main>
  )
}

const STEPS = [
  { icon: Users, title: 'Monte o grupo', text: 'Crie o grupo e mande o link para 2 a 6 amigos. Sem cadastro: só um nome.' },
  { icon: Mic, title: 'Cada um escolhe', text: 'Cada pessoa joga até 5 bandas, artistas ou gêneros que gostaria de ouvir.' },
  { icon: Shuffle, title: 'Sorteio ou votação', text: 'O líder decide: uma roleta sorteia o álbum, ou o grupo vota em segredo entre 6 opções.' },
  { icon: Headphones, title: 'Ouçam juntos', text: 'Abram o álbum inteiro e conversem depois. Álbum que já saiu nunca mais volta.' },
]

/** Como a rodada funciona, em quatro passos de grade. */
function Steps() {
  return (
    <section aria-label="Como funciona" className="space-y-3 border-t-[3px] border-foreground pt-3">
      <h2 className="text-3xl">Como funciona</h2>
      <ol className="box divide-y divide-foreground/20 overflow-hidden">
        {STEPS.map((s, i) => (
          <motion.li key={s.title} {...rise(0.4 + i * 0.08)} className="grid min-h-16 grid-cols-[3rem_minmax(0,1fr)_auto] items-center gap-x-3">
            <span className="tnum grid place-self-stretch place-items-center border-r border-foreground/20 text-3xl font-extrabold" style={{ fontStretch: '62%' }}>{i + 1}</span>
            <div className="py-3">
              <h3 className="text-xl">{s.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{s.text}</p>
            </div>
            <s.icon aria-hidden className="mr-4 size-6" />
          </motion.li>
        ))}
      </ol>
    </section>
  )
}
