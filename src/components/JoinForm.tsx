import { motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { lastfmEnabled, lastfmUserExists } from '@/lib/lastfm'
import { Button } from './ui/button'
import { Card } from './ui/card'
import { Input } from './ui/input'
import { Skeleton } from './ui/skeleton'

export function JoinForm({ gid, onJoined }: { gid: string; onJoined: () => void }) {
  const [preview, setPreview] = useState<Awaited<ReturnType<typeof api.preview>> | false | undefined>(undefined)
  const [name, setName] = useState('')
  const [lastfm, setLastfm] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    api.preview(gid).then((p) => setPreview(p ?? false), () => setPreview(false))
  }, [gid])

  async function join(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    try {
      if (lastfm.trim() && !(await lastfmUserExists(lastfm.trim()))) throw new Error('Usuário do Last.fm não encontrado.')
      await api.join(gid, name, lastfm)
      onJoined()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não consegui entrar')
    } finally {
      setBusy(false)
    }
  }

  if (preview === undefined) return <Skeleton className="mx-auto mt-24 h-64 max-w-md" />
  if (!preview) return <p className="mt-24 text-center text-muted-foreground">Grupo não encontrado. Confira o link do convite.</p>

  return (
    <motion.form onSubmit={join} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mx-auto mt-16 max-w-md px-4">
      <Card className="space-y-4 p-6">
        <div>
          <p className="text-sm text-muted-foreground">{preview.leader_name} te chamou para</p>
          <h1 className="text-2xl font-bold">{preview.name}</h1>
          <p className="text-sm text-muted-foreground">{preview.member_count}/6 pessoas</p>
        </div>
        <Input placeholder="Seu nome" value={name} onChange={(e) => setName(e.target.value)} maxLength={24} required autoFocus />
        {lastfmEnabled && (
          <Input placeholder="Usuário do Last.fm (opcional, evita álbuns que você já ouviu)" value={lastfm} onChange={(e) => setLastfm(e.target.value)} maxLength={40} />
        )}
        <Button type="submit" size="lg" disabled={busy || !name.trim() || preview.member_count >= 6}>
          {preview.member_count >= 6 ? 'Grupo cheio' : busy ? 'Entrando…' : 'Entrar no grupo'}
        </Button>
      </Card>
    </motion.form>
  )
}
