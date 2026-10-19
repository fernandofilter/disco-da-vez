import { motion } from 'motion/react'
import { Volume2, VolumeX } from 'lucide-react'
import { useMuted } from '@/lib/sound'
import { cn } from '@/lib/utils'


export type MarkState = 'done' | 'pending' | 'na' | 'off'

/** Estado por forma, não por cor: quadrado cheio é feito, tracejado é pendente, traço é não se aplica. */
export function Mark({ state, className }: { state: MarkState; className?: string }) {
  return <span aria-hidden className={cn('mark', className)} data-state={state} />
}

/** Faixa de meio-tom com seis vagas, uma por pessoa do grupo; a primeira, em azul, é você. Entra como registro de impressão. */
export function TarjaBand({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn('halftone grid h-5 grid-cols-6 gap-1.5', className)}>
      {Array.from({ length: 6 }, (_, i) => (
        <span key={i} className={i === 0 ? 'you' : 'bg-foreground'} style={{ transformOrigin: 'left', animation: `band-in 0.55s cubic-bezier(0.22, 1, 0.36, 1) ${i * 70}ms both` }} />
      ))}
    </div>
  )
}

/** Quadradinho de pessoa na linha do AGORA: a inicial e a marca de estado no canto; só o seu é azul. */
export function Chip({ mine, initial, state }: { mine: boolean; initial: string; state: MarkState }) {
  return (
    <span className={cn('relative grid size-9 place-items-center border-[1.5px] border-foreground text-base font-extrabold', mine ? 'you' : 'bg-card')}>
      {initial}
      <Mark state={state} className="absolute -bottom-1.5 -right-1.5 size-4 border-[1.5px] bg-card" />
    </span>
  )
}

/** O próximo passo de quem está olhando, em uma linha só. */
export function Agora({ text, children }: { text: string; children?: React.ReactNode }) {
  return (
    <div className="space-y-2.5">
      <p aria-live="polite" className="flex items-start gap-2.5 text-2xl font-extrabold uppercase leading-[0.95] sm:text-4xl" style={{ fontStretch: '62%' }}>
        <span aria-hidden className="live-dot mt-[0.12em] text-live" />
        <span>
          <span className="text-muted-foreground">Agora: </span>
          <motion.span key={text} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}>
            {text}
          </motion.span>
        </span>
      </p>
      {children}
    </div>
  )
}

/** Dois botões lado a lado; o escolhido fica em tinta cheia e com quadrado cheio, o outro em contorno. */
export function Segmented<T extends string>({ value, onChange, options, label }: { value: T; onChange: (v: T) => void; options: { v: T; label: string; icon?: React.ReactNode }[]; label: string }) {
  return (
    <div role="group" aria-label={label} className="grid grid-cols-2 gap-2">
      {options.map((o) => {
        const on = value === o.v
        return (
          <button
            key={o.v}
            type="button"
            onClick={() => onChange(o.v)}
            aria-pressed={on}
            className={cn(
              'flex min-h-11 items-center justify-center gap-2 rounded border-[1.5px] border-foreground px-3 py-2 text-sm font-semibold transition-colors',
              on ? 'bg-foreground text-background' : 'bg-card hover:bg-muted',
            )}
          >
            <span aria-hidden className={cn('size-3 shrink-0 border-2 border-current', on && 'bg-current')} />
            {o.icon && <span aria-hidden className="hidden shrink-0 sm:block">{o.icon}</span>}
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

/** Botão do som, só o ícone: vem desligado; o rótulo é fixo e o estado vai em aria-pressed. */
export function SoundToggle({ className }: { className?: string }) {
  const [muted, setMuted] = useMuted()
  return (
    <button
      type="button"
      onClick={() => setMuted(!muted)}
      aria-pressed={!muted}
      aria-label="Som"
      title={muted ? 'Ligar o som' : 'Desligar o som'}
      className={cn('grid size-11 place-items-center rounded border-[1.5px] border-foreground bg-card hover:bg-muted', className)}
    >
      {muted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
    </button>
  )
}

export const BRAND = 'Disco da Vez'

/** Marca: um disco sobre a tinta, com o ponto vermelho de "ao vivo" no canto. Usa a cor do texto e o papel da página. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden className={cn('shrink-0', className)}>
      <rect width="64" height="64" rx="6" fill="currentColor" />
      <circle cx="31" cy="34" r="19" style={{ fill: 'var(--background)' }} />
      <circle cx="31" cy="34" r="11" fill="none" stroke="currentColor" strokeWidth="2.2" />
      <circle cx="31" cy="34" r="3.6" fill="currentColor" />
      <circle cx="51" cy="13" r="7.5" style={{ fill: 'var(--live)', stroke: 'var(--background)', strokeWidth: 2.5 }} />
    </svg>
  )
}

/** Marca com nome, em caixa alta condensada. */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoMark className="size-8" />
      <span className="text-[1.65rem] font-extrabold uppercase leading-none" style={{ fontStretch: '62%' }}>{BRAND}</span>
    </span>
  )
}

/** Cabeçalho de jornal: marca, data de hoje e o que mais couber à direita. */
export function Masthead({ children }: { children?: React.ReactNode }) {
  const raw = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
  const date = raw.charAt(0).toUpperCase() + raw.slice(1)
  return (
    <div className="flex items-center justify-between gap-x-4 gap-y-2 border-b-[3px] border-foreground pb-3">
      <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1">
        <Logo />
        <span className="text-sm font-medium text-muted-foreground">{date}</span>
      </div>
      {children}
    </div>
  )
}
