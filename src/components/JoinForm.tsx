import { motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { sfx } from '@/lib/sound'
import { Button } from './ui/button'
import { Card } from './ui/card'
import { Input } from './ui/input'
import { Skeleton } from './ui/skeleton'
import { Masthead, SoundToggle, TarjaBand, Footer } from './Guide'

export function JoinForm({ gid, onJoined }: { gid: string; onJoined: () => void }) {
  const [preview, setPreview] = useState<Awaited<ReturnType<typeof api.preview>> | false | undefined>(undefined)
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    api.preview(gid).then((p) => setPreview(p ?? false), () => setPreview(false))
  }, [gid])

  async function join(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    try {
      await api.join(gid, name)
      onJoined()
    } catch (err) {
      sfx.error()
      toast.error(err instanceof Error ? err.message : 'Não consegui entrar')
    } finally {
      setBusy(false)
    }
  }

  if (preview === undefined) return <Skeleton className="mx-auto mt-24 h-64 max-w-md" />
  if (!preview) return <p className="mt-24 text-center text-muted-foreground">Grupo não encontrado. Confira o link do convite.</p>

  return (
    <main className="mx-auto max-w-xl px-4 pb-14 pt-4 sm:pt-6">
      <Masthead>
        <SoundToggle />
      </Masthead>
      <section className="space-y-3 py-8">
        <p className="text-lg font-medium">{preview.leader_name} te chamou para</p>
        <h1 className="break-words text-[clamp(3.5rem,16vw,6rem)]">{preview.name}</h1>
        <p className="tnum text-sm font-semibold text-muted-foreground">{preview.member_count}/6 pessoas</p>
      </section>
      <TarjaBand />
      <motion.form onSubmit={join} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.3, ease: [0.22, 1, 0.36, 1] }} className="mt-8">
        <Card className="gap-4 rounded-none border-t-[6px] p-5">
          <Input aria-label="Seu nome" placeholder="Seu nome" value={name} onChange={(e) => setName(e.target.value)} maxLength={24} required autoFocus />
          <Button type="submit" size="lg" disabled={busy || !name.trim() || preview.member_count >= 6}>
            {preview.member_count >= 6 ? 'Grupo cheio' : busy ? 'Entrando…' : 'Entrar no grupo'}
          </Button>
        </Card>
      </motion.form>
      <Footer />
    </main>
  )
}
