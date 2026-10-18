import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const supabaseConfigured = Boolean(url && key)

export const supabase = createClient(url ?? 'http://localhost:54321', key ?? 'missing', {
  auth: { persistSession: true, autoRefreshToken: true },
})

let session: Promise<string> | null = null

/** Sessão anônima: identifica o navegador sem pedir cadastro. */
export function ensureSession(): Promise<string> {
  session ??= (async () => {
    const { data } = await supabase.auth.getSession()
    if (data.session) return data.session.user.id
    const { data: anon, error } = await supabase.auth.signInAnonymously()
    if (error || !anon.user) throw error ?? new Error('Falha no login anônimo')
    return anon.user.id
  })().catch((e) => {
    session = null
    throw e
  })
  return session
}
