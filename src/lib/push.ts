import { api } from './api'
import { ensureSession, supabase } from './supabase'

// Avisos no celular (Web Push). O sino do grupo inscreve este aparelho; o banco avisa a Edge Function `push`
// a cada etapa da rodada e ela manda o aviso, que aparece mesmo com o navegador fechado (public/sw.js mostra).
const KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined
const WANT = 'disco:push:' // + id do grupo: este aparelho quer avisos do grupo (para reinscrever se a inscrição mudar)

const isIos = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
const installed = () => matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true

/**
 * - `ok`: dá para ligar aqui;
 * - `install`: iPhone/iPad no Safari: os avisos só existem no app da Tela de Início;
 * - `off`: este navegador não tem Web Push, ou o projeto não configurou a chave VAPID (o sino nem aparece).
 */
export function pushSupport(): 'ok' | 'install' | 'off' {
  if (!KEY || typeof window === 'undefined') return 'off'
  if ('serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window) return 'ok'
  return isIos() && !installed() ? 'install' : 'off'
}

const keyBytes = (b64url: string) => Uint8Array.from(atob(b64url.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0))

const sameKey = (a: ArrayBuffer | null | undefined, b: Uint8Array) => !!a && a.byteLength === b.length && new Uint8Array(a).every((x, i) => x === b[i])

const want = {
  get: (gid: string) => {
    try {
      return localStorage.getItem(WANT + gid) === '1'
    } catch {
      return false
    }
  },
  set: (gid: string, on: boolean) => {
    try {
      if (on) localStorage.setItem(WANT + gid, '1')
      else localStorage.removeItem(WANT + gid)
    } catch {
      /* sem storage: só não reinscreve sozinho */
    }
  },
}

/** A inscrição deste aparelho no serviço de push, criada se faltar (ou refeita se foi feita com outra chave). */
async function subscription(): Promise<PushSubscription> {
  await navigator.serviceWorker.register('/sw.js')
  const reg = await navigator.serviceWorker.ready
  const key = keyBytes(KEY!)
  const cur = await reg.pushManager.getSubscription()
  if (cur && sameKey(cur.options.applicationServerKey, key)) return cur
  await cur?.unsubscribe()
  return reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key })
}

async function save(gid: string, sub: PushSubscription) {
  const { endpoint, keys } = sub.toJSON()
  if (!endpoint || !keys?.p256dh || !keys.auth) throw new Error('O navegador não entregou a inscrição de avisos.')
  await api.savePush(gid, endpoint, keys.p256dh, keys.auth)
}

/** O sino deste grupo está ligado neste aparelho? (permissão dada, inscrição viva e registrada no grupo) */
export async function pushIsOn(gid: string, memberId: string): Promise<boolean> {
  if (pushSupport() !== 'ok' || Notification.permission !== 'granted') return false
  const reg = await navigator.serviceWorker.getRegistration('/')
  const sub = await reg?.pushManager.getSubscription()
  if (!sub) {
    // a inscrição sumiu (o navegador renovou ou limpou): quem tinha ligado volta a receber sem precisar notar
    if (!want.get(gid)) return false
    await save(gid, await subscription())
    return true
  }
  await ensureSession()
  const { data } = await supabase.from('push_subscriptions').select('member_id').eq('member_id', memberId).eq('endpoint', sub.endpoint).maybeSingle()
  if (data) return true
  if (!want.get(gid)) return false
  await save(gid, sub)
  return true
}

/** Liga o sino. Chamar direto do toque no botão: o Safari só pede permissão dentro do gesto. */
export async function enablePush(gid: string) {
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    throw new Error(permission === 'denied' ? 'Os avisos estão bloqueados para este site. Libere nas configurações do navegador e tente de novo.' : 'Sem permissão, sem avisos.')
  }
  const sub = await subscription().catch(() => {
    throw new Error('Este navegador não conseguiu ativar os avisos. Tente pelo Chrome ou, no iPhone, pelo app da Tela de Início.')
  })
  await save(gid, sub)
  want.set(gid, true)
}

/** Desliga o sino deste grupo (a inscrição do aparelho fica: outros grupos podem estar usando). */
export async function disablePush(gid: string) {
  want.set(gid, false)
  const reg = await navigator.serviceWorker.getRegistration('/')
  const sub = await reg?.pushManager.getSubscription()
  if (sub) await api.deletePush(gid, sub.endpoint)
}
