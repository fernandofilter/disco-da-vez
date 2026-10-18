import { motion } from 'motion/react'
import { Disc3 } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { api } from '@/lib/api'
import { lastfmEnabled, lastfmUserExists } from '@/lib/lastfm'

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
      toast.error(err instanceof Error ? err.message : 'Não consegui criar o grupo')
      setBusy(false)
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-4xl flex-col justify-center gap-10 px-4 py-10 md:flex-row md:items-center">
      <motion.div initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} className="flex-1 space-y-5">
        <div className="relative size-28">
          <div className="absolute inset-0 animate-[spin_5s_linear_infinite] rounded-full bg-[conic-gradient(from_0deg,#1c1530,#4c1d95,#1c1530,#a21caf,#1c1530)] shadow-[0_0_60px_-10px] shadow-primary">
            <div className="absolute inset-[34%] rounded-full bg-primary" />
            <div className="absolute inset-[47%] rounded-full bg-background" />
          </div>
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">Album Sort</h1>
        <p className="max-w-md text-lg text-muted-foreground">
          Monte um grupo com os amigos, cada um joga suas bandas ou gêneros favoritos e a roleta escolhe o álbum que todo mundo escuta, discute e descobre junto.
        </p>
      </motion.div>

      <motion.div initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} className="w-full max-w-sm space-y-4">
        <form onSubmit={create}>
          <Card className="space-y-3 p-5">
            <h2 className="text-lg font-semibold">Criar grupo</h2>
            <Input placeholder="Nome do grupo" value={group} onChange={(e) => setGroup(e.target.value)} maxLength={40} required />
            <Input placeholder="Seu nome" value={name} onChange={(e) => setName(e.target.value)} maxLength={24} required />
            {lastfmEnabled && <Input placeholder="Usuário do Last.fm (opcional)" value={lastfm} onChange={(e) => setLastfm(e.target.value)} maxLength={40} />}
            <Button type="submit" size="lg" disabled={busy || !group.trim() || !name.trim()}>
              <Disc3 className={busy ? 'animate-spin' : ''} /> {busy ? 'Criando…' : 'Criar e convidar amigos'}
            </Button>
          </Card>
        </form>
        {mine.length > 0 && (
          <Card className="space-y-2 p-4">
            <h2 className="text-sm font-semibold text-muted-foreground">Seus grupos</h2>
            {mine.map((g) => (
              <Link key={g.id} to={`/g/${g.id}`} className="block rounded-lg px-2 py-1.5 hover:bg-muted">{g.name}</Link>
            ))}
          </Card>
        )}
      </motion.div>
    </main>
  )
}
