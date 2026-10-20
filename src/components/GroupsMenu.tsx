import { Users } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '@/lib/api'
import { forgetGroup, savedGroups } from '@/lib/groups'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog'
import { Skeleton } from './ui/skeleton'

/** members: null = carregando, -1 = não deu para consultar (some o número, o atalho continua) */
type Row = { id: string; name: string; members: number | null }

/** Botão "Grupos" do cabeçalho: abre a lista dos grupos deste aparelho, com a quantidade de membros de cada um. */
export function GroupsMenu() {
  const [open, setOpen] = useState(false)
  const [rows, setRows] = useState<Row[] | null>(null)

  function onOpenChange(next: boolean) {
    setOpen(next)
    if (!next) return
    const mine = savedGroups()
    setRows(mine.map((g) => ({ ...g, members: null })))
    // contagem vem do servidor; grupo que não existe mais (excluído) sai da lista
    mine.forEach((g) =>
      api.preview(g.id).then(
        (p) => {
          if (!p) forgetGroup(g.id)
          setRows((cur) => cur && (p ? cur.map((r) => (r.id === g.id ? { ...r, name: p.name, members: p.member_count } : r)) : cur.filter((r) => r.id !== g.id)))
        },
        () => setRows((cur) => cur && cur.map((r) => (r.id === g.id ? { ...r, members: -1 } : r))),
      ),
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger render={<button type="button" aria-label="Grupos" className="inline-flex h-11 items-center gap-2 rounded border-[1.5px] border-foreground bg-card px-3 text-sm font-semibold transition-colors hover:bg-muted" />}>
        <Users className="size-5 sm:size-4" />
        <span className="hidden sm:inline">Grupos</span>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-2xl">Seus grupos</DialogTitle>
          <DialogDescription>Grupos que você abriu neste aparelho.</DialogDescription>
        </DialogHeader>
        {rows?.length === 0 ? (
          <p className="text-muted-foreground">Nenhum grupo ainda. Crie um ou entre pelo código na tela inicial.</p>
        ) : (
          <ul className="box divide-y divide-foreground/20 overflow-hidden">
            {rows?.map((g) => (
              <li key={g.id}>
                <Link to={`/g/${g.id}`} onClick={() => setOpen(false)} className="flex min-h-14 items-center justify-between gap-3 bg-card px-4 py-2 text-base font-bold transition-colors hover:bg-muted">
                  <span className="truncate">{g.name}</span>
                  {g.members === null ? <Skeleton className="h-4 w-16" /> : g.members < 0 ? null : <span className="tnum shrink-0 text-sm font-medium text-muted-foreground">{g.members} {g.members === 1 ? 'membro' : 'membros'}</span>}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  )
}
