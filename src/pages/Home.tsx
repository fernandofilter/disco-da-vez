import { motion } from 'motion/react'
import { ArrowRight, Disc3 } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { BRAND, Masthead, SoundToggle, TarjaBand } from '@/components/Guide'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { api } from '@/lib/api'
import { lastfmEnabled, lastfmUserExists } from '@/lib/lastfm'
import { sfx } from '@/lib/sound'

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

export default function Home() {
  const nav = useNavigate()
  const [group, setGroup] = useState('')
  const [name, setName] = useState('')
  const [lastfm, setLastfm] = useState('')
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

  return (
    <main className="mx-auto max-w-6xl px-4 pb-14 pt-4 sm:pt-6">
      <Masthead>
        <SoundToggle />
      </Masthead>

      <section className="grid gap-6 py-8 sm:py-12 md:grid-cols-[auto_minmax(0,26rem)] md:items-end md:justify-between md:gap-12">
        <h1 className="text-[clamp(3.6rem,17vw,6rem)]">{BRAND}</h1>
        <p className="text-lg font-medium leading-snug">
          Monte um grupo com os amigos, cada um joga suas bandas ou gêneros favoritos e a roleta escolhe o álbum que todo mundo escuta, discute e descobre junto.
        </p>
      </section>
      <TarjaBand />

      <div className="mt-10 grid gap-10 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:gap-12">
        <motion.form onSubmit={create} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}>
          <Card className="gap-3 rounded-none border-t-[6px] p-5">
            <h2 className="text-3xl">Criar grupo</h2>
            <Input aria-label="Nome do grupo" placeholder="Nome do grupo" value={group} onChange={(e) => setGroup(e.target.value)} maxLength={40} required />
            <Input aria-label="Seu nome" placeholder="Seu nome" value={name} onChange={(e) => setName(e.target.value)} maxLength={24} required />
            {lastfmEnabled && <Input aria-label="Usuário do Last.fm" placeholder="Usuário do Last.fm (opcional)" value={lastfm} onChange={(e) => setLastfm(e.target.value)} maxLength={40} />}
            <Button type="submit" size="lg" disabled={busy || !group.trim() || !name.trim()}>
              <Disc3 className={busy ? 'animate-spin' : ''} /> {busy ? 'Criando…' : 'Criar e convidar amigos'}
            </Button>
          </Card>
        </motion.form>

        <section aria-label="Seus grupos" className="space-y-3 border-t-[3px] border-foreground pt-3">
          <h2 className="text-3xl">Seus grupos</h2>
          {mine.length > 0 ? (
            <ul className="box divide-y divide-foreground/20 overflow-hidden">
              {mine.map((g) => (
                <li key={g.id}>
                  <Link to={`/g/${g.id}`} className="flex min-h-14 items-center justify-between gap-3 bg-card px-4 py-2 text-lg font-bold hover:bg-muted">
                    <span className="truncate">{g.name}</span>
                    <ArrowRight className="size-5 shrink-0" />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="border-[1.5px] border-dashed border-foreground/50 px-4 py-6 text-sm text-muted-foreground">Nenhum grupo ainda. Crie o primeiro e mande o link para os amigos.</p>
          )}
        </section>
      </div>
    </main>
  )
}
