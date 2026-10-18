import { useSyncExternalStore } from 'react'

/** Sons sintetizados com Web Audio (nenhum arquivo): carimbo, caneta, fita de teleimpressor, gongo de programa. */
const KEY = 'album-sort:muted'
const read = () => {
  try {
    return localStorage.getItem(KEY) !== '0' // desligado por padrão: só liga quem escolheu ligar
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
  /** letra batendo no teleimpressor, uma por capa que passa; `speed` de 0 a 1 */
  tick(speed = 0.5) {
    const a = audio()
    if (!a) return
    hit(a, a.c.currentTime, 0.012, 2000 + speed * 1800, 2.4, 0.1 + speed * 0.14)
  },
  /** teleimpressor rodando durante a fita do sorteio */
  spin(seconds: number) {
    const a = audio()
    if (!a) return
    stopSpin?.()
    const t = a.c.currentTime
    const s = a.c.createBufferSource()
    s.buffer = a.buf
    s.loop = true
    const f = a.c.createBiquadFilter()
    f.type = 'bandpass'
    f.Q.value = 1.4
    f.frequency.setValueAtTime(1800, t)
    f.frequency.exponentialRampToValueAtTime(3600, t + seconds * 0.3)
    f.frequency.exponentialRampToValueAtTime(1400, t + seconds)
    const g = a.c.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.linearRampToValueAtTime(0.07, t + 0.4)
    g.gain.linearRampToValueAtTime(0.02, t + seconds)
    s.connect(f).connect(g).connect(a.out)
    s.start(t)
    const stop = () => {
      const n = a.c.currentTime
      g.gain.cancelScheduledValues(n)
      g.gain.setValueAtTime(g.gain.value, n)
      g.gain.linearRampToValueAtTime(0.0001, n + 0.05)
      s.stop(n + 0.08)
      if (stopSpin === stop) stopSpin = null
    }
    stopSpin = stop
  },
  /** corta o teleimpressor (ex.: a roleta saiu da tela no meio da fita) */
  hush() {
    stopSpin?.()
  },
  /** a fita parou no álbum da noite: carimbo e gongo de abertura de programa */
  lock() {
    stopSpin?.()
    const a = audio()
    if (!a) return
    const t = a.c.currentTime + 0.06
    hit(a, t, 0.06, 700, 1.1, 0.5)
    tone(a, t, 120, 0.12, 0.4, 'sine', 0.002, 60)
    tone(a, t + 0.1, 659.3, 1.4, 0.13, 'triangle', 0.004)
    tone(a, t + 0.1, 830.6, 1.4, 0.09, 'triangle', 0.004)
    tone(a, t + 0.26, 987.8, 1.6, 0.1, 'sine', 0.004)
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
