import { motion, useMotionValue, useSpring } from 'motion/react'
import { X } from 'lucide-react'
import { useState } from 'react'
import { coverUrl } from '@/lib/musicbrainz'
import type { Album } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Cover } from './Cover'
import { Button } from './ui/button'
import { Dialog, DialogClose, DialogContent, DialogTitle } from './ui/dialog'

const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** Inclina o conteúdo na direção do ponteiro (como uma capa de papelão na mão); o ponteiro é medido no próprio recipiente. */
function Tilt({ max, className, innerClassName, children }: { max: number; className?: string; innerClassName?: string; children: React.ReactNode }) {
  const rx = useSpring(useMotionValue(0), { stiffness: 220, damping: 22 })
  const ry = useSpring(useMotionValue(0), { stiffness: 220, damping: 22 })
  return (
    <div
      className={className}
      style={{ perspective: 900 }}
      onPointerMove={(e) => {
        if (e.pointerType === 'touch' || reduceMotion()) return
        const r = e.currentTarget.getBoundingClientRect()
        ry.set(((e.clientX - r.left) / r.width - 0.5) * 2 * max)
        rx.set(-((e.clientY - r.top) / r.height - 0.5) * 2 * max)
      }}
      onPointerLeave={() => {
        rx.set(0)
        ry.set(0)
      }}
    >
      <motion.div style={{ rotateX: rx, rotateY: ry }} className={innerClassName}>
        {children}
      </motion.div>
    </div>
  )
}

/** A maior capa que o Cover Art Archive tiver: 1200px, ou 500px nos discos antigos que não têm miniatura grande. */
function BigCover({ album }: { album: Pick<Album, 'id' | 'title'> }) {
  const [size, setSize] = useState<1200 | 500 | null>(1200)
  if (!size) return <Cover album={album} className="size-full" />
  return <img src={coverUrl(album.id, size)} alt={album.title} draggable={false} onError={() => setSize(size === 1200 ? 500 : null)} className="size-full object-cover ring-1 ring-paper-ink/30" />
}

/** Capa que inclina ao passar o mouse e abre em tela cheia ao clicar (clique fora, Esc ou o botão fecham). */
export function CoverZoom({ album, size = 500, className }: { album: Pick<Album, 'id' | 'title'>; size?: 250 | 500; className?: string }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Tilt max={9} className={className}>
        <button type="button" onClick={() => setOpen(true)} aria-label={`Ver a capa de ${album.title} em tela cheia`} className="block w-full cursor-zoom-in">
          <Cover album={album} size={size} className="w-full" />
        </button>
      </Tilt>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          showCloseButton={false}
          className={cn('top-0 left-0 h-dvh w-dvw max-w-none translate-x-0 translate-y-0 rounded-none bg-foreground/96 p-0 ring-0 sm:max-w-none')}
          onClick={() => setOpen(false)}
        >
          <DialogTitle className="sr-only">{album.title}</DialogTitle>
          <Tilt max={14} className="grid size-full place-items-center p-4" innerClassName="w-[min(88vw,88dvh)] cursor-zoom-out">
            <div className="aspect-square w-full">
              <BigCover album={album} />
            </div>
          </Tilt>
          <DialogClose render={<Button variant="outline" size="icon-lg" aria-label="Fechar" className="absolute right-4 top-4" />}>
            <X />
          </DialogClose>
        </DialogContent>
      </Dialog>
    </>
  )
}
