/** A espera da busca de álbuns: uma faixa riscada em tinta que anda (a mesma do passo atual das etapas) (sem som). A roleta só entra depois, com o álbum já definido. */
export function Garimpo({ hint = 'Buscando nas escolhas da rodada' }: { hint?: string }) {
  return (
    <div role="status" className="box space-y-3 p-4">
      <p className="text-3xl font-extrabold uppercase leading-none" style={{ fontStretch: '62%' }}>Garimpando álbuns…</p>
      <span className="slot block h-4 w-full" data-state="now" style={{ '--c': 'var(--foreground)' } as React.CSSProperties} />
      <p className="text-sm text-muted-foreground">{hint}</p>
    </div>
  )
}
