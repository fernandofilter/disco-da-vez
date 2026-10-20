import { useSyncExternalStore } from 'react'

/** Sons sintetizados com Web Audio (nenhum arquivo): carimbo, caneta, fita de teleimpressor, gongo de programa. */
const KEY = 'album-sort:muted'
const read = () => {
  try {
    return localStorage.getItem(KEY) === '1' // ligado por padrão: só fica mudo quem desligou
  } catch {
    return false
  }
}

let muted = read()
let ctx: AudioContext | null = null
let master: GainNode | null = null
let noise: AudioBuffer | null = null
let stopSpin: (() => void) | null = null
const listeners = new Set<() => void>()

/** O navegador só libera áudio depois de um gesto: o primeiro toque cria e acorda o contexto, mesmo mudo. */
function unlock() {
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AC) return
    ctx = new AC()
    const limiter = ctx.createDynamicsCompressor()
    limiter.threshold.value = -14
    limiter.ratio.value = 8
    master = ctx.createGain()
    master.gain.value = 0.6
    master.connect(limiter).connect(ctx.destination)
    noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate)
    const d = noise.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  }
  if (ctx.state === 'suspended') void ctx.resume()
}

function audio() {
  if (muted || !ctx || ctx.state !== 'running') return null
  return { c: ctx, out: master!, buf: noise! }
}

type A = NonNullable<ReturnType<typeof audio>>

function hit(a: A, at: number, dur: number, freq: number, q: number, gain: number) {
  const s = a.c.createBufferSource()
  s.buffer = a.buf
  const f = a.c.createBiquadFilter()
  f.type = 'bandpass'
  f.frequency.value = freq
  f.Q.value = q
  const g = a.c.createGain()
  g.gain.setValueAtTime(gain, at)
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur)
  s.connect(f).connect(g).connect(a.out)
  s.start(at, Math.random() * 0.5, dur + 0.02)
}

function tone(a: A, at: number, freq: number, dur: number, gain: number, type: OscillatorType = 'sine', attack = 0.005, to?: number) {
  const o = a.c.createOscillator()
  o.type = type
  o.frequency.setValueAtTime(freq, at)
  if (to) o.frequency.exponentialRampToValueAtTime(to, at + dur)
  const g = a.c.createGain()
  g.gain.setValueAtTime(0.0001, at)
  g.gain.linearRampToValueAtTime(gain, at + attack)
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur)
  o.connect(g).connect(a.out)
  o.start(at)
  o.stop(at + dur + 0.05)
}

export const sfx = {
  /** toque de caneta esferográfica */
  click() {
    const a = audio()
    if (!a) return
    const t = a.c.currentTime
    hit(a, t, 0.025, 3200, 1.6, 0.3)
    tone(a, t, 520, 0.03, 0.12, 'square', 0.001, 300)
  },
  /** a palheta da roleta batendo num pino: um "toc" de madeira por capa que passa; `speed` de 0 a 1 (mais rápido = mais forte e mais agudo) */
  tick(speed = 0.5) {
    const a = audio()
    if (!a) return
    const t = a.c.currentTime
    const v = 0.94 + Math.random() * 0.12 // nenhum toc sai idêntico ao outro
    hit(a, t, 0.02, (1300 + speed * 900) * v, 2.6, 0.2 + speed * 0.16)
    tone(a, t, (250 + speed * 170) * v, 0.06, 0.2 + speed * 0.12, 'triangle', 0.001, 150)
  },
  /** o giro começando: um sopro curto de ar sob a fita (o resto do som são os tocs) */
  spin(seconds: number) {
    const a = audio()
    if (!a) return
    stopSpin?.()
    const t = a.c.currentTime
    const dur = Math.min(1.2, seconds * 0.25)
    const s = a.c.createBufferSource()
    s.buffer = a.buf
    s.loop = true
    const f = a.c.createBiquadFilter()
    f.type = 'bandpass'
    f.Q.value = 0.9
    f.frequency.setValueAtTime(500, t)
    f.frequency.exponentialRampToValueAtTime(2400, t + dur * 0.4)
    f.frequency.exponentialRampToValueAtTime(700, t + dur)
    const g = a.c.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.linearRampToValueAtTime(0.06, t + dur * 0.3)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    s.connect(f).connect(g).connect(a.out)
    s.start(t)
    s.stop(t + dur + 0.05)
    const stop = () => {
      const n = a.c.currentTime
      g.gain.cancelScheduledValues(n)
      g.gain.setValueAtTime(Math.max(g.gain.value, 0.0001), n)
      g.gain.linearRampToValueAtTime(0.0001, n + 0.04)
      if (stopSpin === stop) stopSpin = null
    }
    stopSpin = stop
  },
  /** corta o teleimpressor (ex.: a roleta saiu da tela no meio da fita) */
  hush() {
    stopSpin?.()
  },
  /** a fita parou: a palheta cai no último pino e o carimbo bate */
  lock() {
    stopSpin?.()
    const a = audio()
    if (!a) return
    const t = a.c.currentTime + 0.04
    hit(a, t, 0.07, 700, 1.1, 0.55)
    tone(a, t, 130, 0.16, 0.45, 'sine', 0.002, 55)
    tone(a, t, 330, 0.09, 0.2, 'triangle', 0.001, 180)
  },
  /** álbum definido (sorteio, desempate ou votação): fanfarra curta de abertura de programa, subindo até a oitava */
  win() {
    const a = audio()
    if (!a) return
    const t = a.c.currentTime + 0.02
    ;[523.3, 659.3, 784, 1046.5].forEach((f, i) => {
      tone(a, t + i * 0.09, f, 0.5 + i * 0.12, 0.13, 'triangle', 0.005)
      tone(a, t + i * 0.09, f * 2, 0.35, 0.04, 'sine', 0.005)
    })
    tone(a, t + 0.36, 1318.5, 1.6, 0.11, 'sine', 0.006) // o sino final, que fica no ar
    tone(a, t + 0.36, 523.3, 1.6, 0.08, 'triangle', 0.006)
    hit(a, t + 0.36, 0.25, 5200, 2, 0.12)
  },
  /** voto carimbado */
  vote() {
    const a = audio()
    if (!a) return
    const t = a.c.currentTime
    hit(a, t, 0.07, 600, 1, 0.55)
    tone(a, t, 110, 0.14, 0.45, 'sine', 0.002, 55)
    tone(a, t + 0.08, 880, 0.3, 0.1, 'sine', 0.004)
  },
  /** alguém entrou no grupo */
  join() {
    const a = audio()
    if (!a) return
    const t = a.c.currentTime
    tone(a, t, 523.3, 0.3, 0.14, 'triangle', 0.008)
    tone(a, t + 0.11, 784, 0.5, 0.14, 'triangle', 0.008)
  },
  /** marca de "pronto" feita na grade */
  ready() {
    const a = audio()
    if (!a) return
    const t = a.c.currentTime
    hit(a, t, 0.05, 900, 1.2, 0.45)
    tone(a, t, 130, 0.09, 0.35, 'sine', 0.002, 70)
  },
  error() {
    const a = audio()
    if (!a) return
    const t = a.c.currentTime
    const o = a.c.createOscillator()
    o.type = 'square'
    o.frequency.setValueAtTime(140, t)
    const f = a.c.createBiquadFilter()
    f.type = 'lowpass'
    f.frequency.value = 520
    const g = a.c.createGain()
    g.gain.setValueAtTime(0.14, t)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.26)
    o.connect(f).connect(g).connect(a.out)
    o.start(t)
    o.stop(t + 0.28)
  },
  /** som ligado: duas notas curtas confirmando */
  on() {
    const a = audio()
    if (!a) return
    const t = a.c.currentTime
    tone(a, t, 659.3, 0.16, 0.12, 'triangle', 0.004)
    tone(a, t + 0.08, 987.8, 0.26, 0.12, 'triangle', 0.004)
  },
}

/** Libera o áudio no primeiro gesto e toca o clique só quando o toque vira ativação (um scroll não clica). */
export function initSound() {
  // iOS e Android só contam pointerup/touchend/click como ativação; pointerdown e keydown cobrem mouse e teclado
  const gesture = () => unlock()
  for (const t of ['pointerdown', 'pointerup', 'touchend', 'keydown', 'click']) document.addEventListener(t, gesture, { capture: true })
  document.addEventListener(
    'click',
    (e) => {
      const el = (e.target as Element | null)?.closest('button, a[href], [role="option"], [cmdk-item], summary')
      if (el && !el.hasAttribute('disabled') && el.getAttribute('aria-disabled') !== 'true') sfx.click()
    },
    { capture: true },
  )
  document.addEventListener('visibilitychange', () => {
    if (!ctx) return
    if (document.hidden) void ctx.suspend()
    else if (!muted) void ctx.resume()
  })
}

export function setMuted(next: boolean) {
  muted = next
  try {
    localStorage.setItem(KEY, next ? '1' : '0')
  } catch {
    /* sem storage: só não lembra a escolha */
  }
  if (next) stopSpin?.()
  else sfx.on()
  listeners.forEach((l) => l())
}

export function useMuted() {
  const value = useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => muted,
  )
  return [value, setMuted] as const
}
