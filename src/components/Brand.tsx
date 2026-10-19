import { useId } from 'react'
import { cn } from '@/lib/utils'

/** Marcas dos serviços, desenhadas em uma cor só (a do texto) com o desenho vazado: seguem a regra de só tinta no papel. */
function Mark({ children, className, label }: { children: (mask: string) => React.ReactNode; className?: string; label?: string }) {
  const id = useId()
  return (
    <svg viewBox="0 0 24 24" role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true} className={cn('size-5 shrink-0', className)}>
      {children(id)}
    </svg>
  )
}

const cut = { fill: 'none', stroke: '#000', strokeLinecap: 'round' } as const

export function SpotifyIcon({ className, label }: { className?: string; label?: string }) {
  return (
    <Mark className={className} label={label}>
      {(id) => (
        <>
          <mask id={id}>
            <rect width="24" height="24" fill="#fff" />
            <path d="M5.4 9.1Q12 6.6 18.7 10" {...cut} strokeWidth="2.3" />
            <path d="M6.4 12.7Q12 10.9 17.5 13.6" {...cut} strokeWidth="1.9" />
            <path d="M7.4 16.1Q12 14.6 16.4 16.8" {...cut} strokeWidth="1.5" />
          </mask>
          <circle cx="12" cy="12" r="11" fill="currentColor" mask={`url(#${id})`} />
        </>
      )}
    </Mark>
  )
}

export function YtMusicIcon({ className, label }: { className?: string; label?: string }) {
  return (
    <Mark className={className} label={label}>
      {(id) => (
        <>
          <mask id={id}>
            <rect width="24" height="24" fill="#fff" />
            <circle cx="12" cy="12" r="7.1" {...cut} strokeWidth="1.5" />
            <path d="M10.1 8.6 15.9 12 10.1 15.4Z" fill="#000" />
          </mask>
          <circle cx="12" cy="12" r="11" fill="currentColor" mask={`url(#${id})`} />
        </>
      )}
    </Mark>
  )
}

/** Marca oficial do Last.fm (Simple Icons, "lastdotfm", CC0). */
export function LastfmIcon({ className, label }: { className?: string; label?: string }) {
  return (
    <Mark className={className} label={label}>
      {() => (
        <path
          fill="currentColor"
          d="M10.584 17.21l-.88-2.392s-1.43 1.594-3.573 1.594c-1.897 0-3.244-1.649-3.244-4.288 0-3.382 1.704-4.591 3.381-4.591 2.42 0 3.189 1.567 3.849 3.574l.88 2.749c.88 2.666 2.529 4.81 7.285 4.81 3.409 0 5.718-1.044 5.718-3.793 0-2.227-1.265-3.381-3.63-3.931l-1.758-.385c-1.21-.275-1.567-.77-1.567-1.595 0-.934.742-1.484 1.952-1.484 1.32 0 2.034.495 2.144 1.677l2.749-.33c-.22-2.474-1.924-3.492-4.729-3.492-2.474 0-4.893.935-4.893 3.932 0 1.87.907 3.051 3.189 3.601l1.87.44c1.402.33 1.869.907 1.869 1.704 0 1.017-.99 1.43-2.86 1.43-2.776 0-3.93-1.457-4.59-3.464l-.907-2.75c-1.155-3.573-2.997-4.893-6.653-4.893C2.144 5.333 0 7.89 0 12.233c0 4.18 2.144 6.434 5.993 6.434 3.106 0 4.591-1.457 4.591-1.457z"
        />
      )}
    </Mark>
  )
}
