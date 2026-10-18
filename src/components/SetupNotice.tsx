import { Card } from './ui/card'

export function SetupNotice() {
  return (
    <main className="mx-auto max-w-xl p-6">
      <Card className="space-y-3 p-6">
        <h1 className="text-xl font-bold">Falta configurar o Supabase</h1>
        <p className="text-sm text-muted-foreground">
          Copie <code>.env.example</code> para <code>.env</code> e preencha <code>VITE_SUPABASE_URL</code> e <code>VITE_SUPABASE_ANON_KEY</code>.
          Depois rode <code>supabase/migrations/0001_init.sql</code> no SQL Editor e ative <em>Anonymous sign-ins</em> em Authentication → Providers.
        </p>
      </Card>
    </main>
  )
}
