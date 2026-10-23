import { ChevronRight, LogOut, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { forgetGroup, savedGroups } from '@/lib/groups'
import { sfx } from '@/lib/sound'
import { Button } from './ui/button'
import { Skeleton } from './ui/skeleton'

/** members: null = carregando, -1 = não deu para consultar (some o número, o atalho continua) */
type Row = { id: string; name: string; members: number | null; leader?: boolean }

/** Grupos que este aparelho já abriu, com a quantidade de membros de cada um. Sem grupos, não desenha nada. */
export function SavedGroups() {
  const [rows, setRows] = useState<Row[]>(() => savedGroups().map((g) => ({ ...g, members: null })))
  const [asking, setAsking] = useState<string | null>(null) // confirmação de excluir (líder) ou sair (demais)

  useEffect(() => {
    // contagem vem do servidor; grupo que não existe mais (excluído) sai da lista
    savedGroups().forEach((g) =>
      api.preview(g.id).then(
        (p) => {
          if (!p) forgetGroup(g.id)
          setRows((cur) => (p ? cur.map((r) => (r.id === g.id ? { ...r, name: p.name, members: p.member_count, leader: p.is_leader } : r)) : cur.filter((r) => r.id !== g.id)))
        },
        () => setRows((cur) => cur.map((r) => (r.id === g.id ? { ...r, members: -1 } : r))),
      ),
    )
  }, [])

  function remove(g: Row) {
    setAsking(null)
    ;(g.leader ? api.deleteGroup(g.id) : api.leaveGroup(g.id)).then(
      () => {
        forgetGroup(g.id)
        setRows((cur) => cur.filter((r) => r.id !== g.id))
        toast.success(g.leader ? `“${g.name}” excluído` : `Você saiu de “${g.name}”`)
      },
      (e: Error) => {
        sfx.error()
        toast.error(e.message)
      },
    )
  }

  if (rows.length === 0) return null
  return (
    <section aria-labelledby="seus-grupos" className="mb-3 space-y-2">
      <h3 id="seus-grupos" className="text-xl">Seus grupos</h3>
      <ul className="box divide-y divide-foreground/20 overflow-hidden">
        {rows.map((g) =>
          asking === g.id ? (
            <li key={g.id} className="space-y-2 bg-card px-4 py-3">
              <p className="text-sm font-semibold">{g.leader ? `Apagar “${g.name}” e todo o histórico, para todos?` : `Sair de “${g.name}”? Dá para voltar pelo link de convite.`}</p>
              <div className="flex flex-wrap gap-2">
                <Button variant="destructive" size="sm" onClick={() => remove(g)}>{g.leader ? <><Trash2 /> Sim, excluir grupo</> : <><LogOut /> Sim, sair do grupo</>}</Button>
                <Button variant="outline" size="sm" onClick={() => setAsking(null)}>Cancelar</Button>
              </div>
            </li>
          ) : (
            <li key={g.id} className="flex items-stretch">
              <Link to={`/g/${g.id}`} className="group/row flex min-h-14 min-w-0 flex-1 items-center gap-3 bg-card px-4 py-2 text-base font-bold transition-colors hover:bg-you hover:text-you-ink">
                <span className="min-w-0 flex-1 truncate">{g.name}</span>
                {g.members === null ? <Skeleton className="h-4 w-16" /> : g.members < 0 ? null : <span className="tnum shrink-0 text-sm font-medium text-muted-foreground group-hover/row:text-you-ink">{g.members} {g.members === 1 ? 'membro' : 'membros'}</span>}
                <ChevronRight aria-hidden className="size-5 shrink-0 transition-transform duration-300 ease-out group-hover/row:translate-x-0.5" />
              </Link>
              {/* o líder exclui; os demais saem (o líder precisa passar a liderança antes de sair). Sem a migração 0005, leader vem undefined e nada aparece */}
              {g.leader !== undefined && (
                <button type="button" aria-label={g.leader ? `Excluir ${g.name}` : `Sair de ${g.name}`} title={g.leader ? 'Excluir grupo' : 'Sair do grupo'} className="flex w-11 shrink-0 items-center justify-center border-l border-foreground/20 bg-card transition-colors hover:bg-muted" onClick={() => setAsking(g.id)}>
                  {g.leader ? <Trash2 className="size-5" /> : <LogOut className="size-5" />}
                </button>
              )}
            </li>
          ),
        )}
      </ul>
    </section>
  )
}
