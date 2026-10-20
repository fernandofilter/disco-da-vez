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

/** Marca do GitHub (Simple Icons, "github", CC0), em uma cor só. */
export function GithubIcon({ className, label }: { className?: string; label?: string }) {
  return (
    <Mark className={className} label={label}>
      {() => (
        <path
          fill="currentColor"
          d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"
        />
      )}
    </Mark>
  )
}

/** Álbum: a capa (quadrado) com o disco de vinil dentro, no traço dos ícones lucide (2px, pontas redondas). */
export function AlbumIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={cn('size-5 shrink-0', className)}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1" fill="currentColor" />
      <path d="M12 9.2a2.8 2.8 0 0 1 2.8 2.8" strokeWidth="1.5" />
    </svg>
  )
}
