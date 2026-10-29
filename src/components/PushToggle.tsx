import { Bell, BellOff, Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { disablePush, enablePush, pushIsOn, pushSupport } from '@/lib/push'
import { cn } from '@/lib/utils'

/**
 * O sino do grupo: liga os avisos no celular do andamento da rodada (aberta, todos escolheram, roleta parou, votação…),
 * que chegam mesmo com o navegador fechado. Vale para este aparelho e este grupo. Some quando o navegador não tem Web Push.
 */
export function PushToggle({ gid, memberId, className }: { gid: string; memberId: string; className?: string }) {
  const support = pushSupport()
  const [on, setOn] = useState<boolean | null>(support === 'ok' ? null : false) // null: ainda conferindo
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (support !== 'ok') return
    let live = true
    pushIsOn(gid, memberId).then((v) => live && setOn(v), () => live && setOn(false))
    return () => {
      live = false
    }
  }, [gid, memberId, support])

  if (support === 'off') return null

  async function toggle() {
    if (support === 'install') {
      toast.info('No iPhone, os avisos só chegam pelo app: toque em Compartilhar › “Adicionar à Tela de Início”, abra o Disco da Vez por lá, entre no grupo e ligue o sino.', { duration: 12_000 })
      return
    }
    setBusy(true)
    try {
      if (on) {
        await disablePush(gid)
        setOn(false)
        toast.success('Avisos desligados neste aparelho.')
      } else {
        await enablePush(gid)
        setOn(true)
        toast.success('Avisos ligados: você fica sabendo de cada etapa da rodada, mesmo fora do navegador.')
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Não consegui mudar os avisos.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy || on === null}
      aria-pressed={!!on}
      aria-label="Avisos no celular"
      title={on ? 'Desligar os avisos da rodada neste aparelho' : 'Receber avisos da rodada no celular, mesmo com o navegador fechado'}
      className={cn('inline-flex h-11 min-w-11 items-center justify-center gap-2 rounded border-[1.5px] border-foreground px-3 text-sm font-semibold transition-colors disabled:opacity-60', on ? 'bg-foreground text-background hover:bg-foreground/90' : 'bg-card hover:bg-muted', className)}
    >
      {busy || on === null ? <Loader2 className="size-5 animate-spin sm:size-4" /> : on ? <Bell className="size-5 sm:size-4" /> : <BellOff className="size-5 sm:size-4" />}
      <span className="hidden sm:inline">Avisos</span>
    </button>
  )
}
