import { useEffect, useRef } from 'react'
import * as THREE from 'three'

const INK = '#15171c'
const PAPER = '#f2f3f6'
const RED = '#dc2a2b'

const canvas = (size: number) => {
  const c = document.createElement('canvas')
  c.width = c.height = size
  return c
}
const tex = (c: HTMLCanvasElement) => {
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 8
  return t
}

/** Sulcos finos, trilhas mais escuras e o selo vermelho com o nome em arco (é ele que mostra o giro). */
function grooveTexture() {
  const c = canvas(1024), x = c.getContext('2d')!
  const m = 512
  x.fillStyle = INK
  x.fillRect(0, 0, 1024, 1024)
  let seed = 7
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
  for (let r = 498; r > 190; r -= 2.2) {
    x.strokeStyle = `rgba(255,255,255,${0.025 + rnd() * 0.05})`
    x.lineWidth = 1
    x.beginPath()
    x.arc(m, m, r, 0, Math.PI * 2)
    x.stroke()
  }
  for (const r of [392, 318, 252]) {
    x.strokeStyle = INK
    x.lineWidth = 9
    x.beginPath()
    x.arc(m, m, r, 0, Math.PI * 2)
    x.stroke()
  }
  x.strokeStyle = 'rgba(255,255,255,0.22)'
  x.lineWidth = 3
  x.beginPath()
  x.arc(m, m, 507, 0, Math.PI * 2)
  x.stroke()
  // selo
  x.fillStyle = RED
  x.beginPath()
  x.arc(m, m, 172, 0, Math.PI * 2)
  x.fill()
  x.strokeStyle = PAPER
  x.lineWidth = 3
  x.beginPath()
  x.arc(m, m, 152, 0, Math.PI * 2)
  x.stroke()
  x.fillStyle = PAPER
  x.font = '800 40px "Archivo Variable", system-ui, sans-serif'
  x.textAlign = 'center'
  x.textBaseline = 'middle'
  const text = 'DISCO DA VEZ'
  const step = 0.2
  x.save()
  x.translate(m, m)
  x.rotate(-(step * (text.length - 1)) / 2)
  for (const ch of text) {
    x.save()
    x.translate(0, -112)
    x.fillText(ch, 0, 0)
    x.restore()
    x.rotate(step)
  }
  x.restore()
  x.beginPath()
  x.arc(m, m + 108, 7, 0, Math.PI * 2)
  x.fill()
  x.fillStyle = INK
  x.beginPath()
  x.arc(m, m, 14, 0, Math.PI * 2)
  x.fill()
  return tex(c)
}

/** Dois reflexos largos em lados opostos, um frio e um quente, como o brilho que corre num vinil. */
function sheenTexture() {
  const c = canvas(512), x = c.getContext('2d')!
  const g = x.createConicGradient(0, 256, 256)
  const stops: [number, string][] = [
    [0, 'rgba(0,0,0,0)'], [0.05, 'rgba(110,160,255,0.6)'], [0.13, 'rgba(0,0,0,0)'],
    [0.5, 'rgba(0,0,0,0)'], [0.56, 'rgba(255,120,150,0.5)'], [0.64, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0)'],
  ]
  for (const [o, col] of stops) g.addColorStop(o, col)
  x.fillStyle = g
  x.fillRect(0, 0, 512, 512)
  return tex(c)
}

/** A capa: papel, filete de tinta, a marca e o nome em caixa alta condensada. */
function sleeveTexture() {
  const c = canvas(1024), x = c.getContext('2d')!
  x.fillStyle = '#fafbfc'
  x.fillRect(0, 0, 1024, 1024)
  x.fillStyle = INK
  x.fillRect(0, 0, 1024, 26)
  // marca (a do favicon)
  const k = 3.1, ox = 70, oy = 90
  const circle = (cx: number, cy: number, r: number, fill: string, stroke?: string, w = 0) => {
    x.beginPath()
    x.arc(ox + cx * k, oy + cy * k, r * k, 0, Math.PI * 2)
    x.fillStyle = fill
    x.fill()
    if (stroke) {
      x.lineWidth = w * k
      x.strokeStyle = stroke
      x.stroke()
    }
  }
  x.fillStyle = INK
  x.beginPath()
  x.roundRect(ox, oy, 64 * k, 64 * k, 8 * k)
  x.fill()
  circle(31, 34, 19, PAPER)
  circle(31, 34, 11, 'rgba(0,0,0,0)', INK, 2.4)
  circle(31, 34, 3.8, INK)
  circle(51, 13, 8, RED, PAPER, 2.6)
  // nome
  x.fillStyle = INK
  x.textBaseline = 'alphabetic'
  x.font = '800 250px "Archivo Variable", system-ui, sans-serif'
  ;(x as unknown as { fontStretch: string }).fontStretch = 'extra-condensed'
  x.fillText('DISCO', 70, 660)
  x.fillText('DA VEZ', 70, 890)
  // faixa das seis vagas
  const w = (1024 - 140 - 5 * 12) / 6
  for (let i = 0; i < 6; i++) {
    x.fillStyle = i === 0 ? RED : INK
    x.fillRect(70 + i * (w + 12), 940, w, 22)
  }
  return tex(c)
}

const easeOut = (t: number) => 1 - Math.pow(1 - Math.min(Math.max(t, 0), 1), 4)

/** Vinil saindo da capa, em three.js: gira, ganha o reflexo e acompanha o ponteiro. Decorativo; pausa fora da tela e com movimento reduzido. */
export default function Vinyl() {
  const host = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = host.current
    if (!el) return
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
    el.appendChild(renderer.domElement)
    renderer.domElement.className = 'block size-full'

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 50)
    camera.position.set(0, 0, 8.6)
    scene.add(new THREE.AmbientLight(0xffffff, 1.7))
    const key = new THREE.DirectionalLight(0xffffff, 2.6)
    key.position.set(-3, 5, 4)
    scene.add(key)
    const rim = new THREE.DirectionalLight(0x9db8ff, 1.4)
    rim.position.set(4, 1, -2)
    scene.add(rim)

    const rig = new THREE.Group()
    scene.add(rig)

    const grooves = grooveTexture()
    const sheenMap = sheenTexture()
    const sleeveMap = sleeveTexture()

    const inkMat = new THREE.MeshStandardMaterial({ color: INK, roughness: 0.5, metalness: 0.2 })
    const disc = new THREE.Mesh(
      new THREE.CylinderGeometry(1, 1, 0.035, 96),
      [inkMat, new THREE.MeshStandardMaterial({ map: grooves, roughness: 0.42, metalness: 0.3 }), inkMat],
    )
    const sheen = new THREE.Mesh(
      new THREE.CircleGeometry(0.99, 96),
      new THREE.MeshBasicMaterial({ map: sheenMap, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }),
    )
    sheen.rotation.x = -Math.PI / 2
    sheen.position.y = 0.0185
    const record = new THREE.Group()
    record.add(disc, sheen)
    rig.add(record)

    const sleeve = new THREE.Mesh(
      new THREE.BoxGeometry(2.1, 0.05, 2.1),
      [0, 1, 2, 3, 4, 5].map((i) => new THREE.MeshStandardMaterial(i === 2 ? { map: sleeveMap, roughness: 0.85 } : { color: PAPER, roughness: 0.85 })),
    )
    sleeve.position.set(-0.75, 0.08, 0)
    rig.add(sleeve)
    // BoxGeometry: a face de cima (+y) é o índice 2 do grupo de materiais

    const base = { x: 0.95, y: 0.2, z: 0.12 } // inclina o prato para a câmera
    rig.rotation.set(base.x, base.y, base.z)

    const size = () => {
      const { clientWidth: w, clientHeight: h } = el
      if (!w || !h) return
      renderer.setSize(w, h, false)
      camera.aspect = w / h
      // enquadra a capa e o disco inteiros também em telas estreitas
      camera.position.z = Math.max(8.6, 8.8 / Math.min(1, camera.aspect * 1.2))
      camera.updateProjectionMatrix()
    }
    size()
    const ro = new ResizeObserver(() => {
      size()
      if (reduce) frame(performance.now())
    })
    ro.observe(el)

    const pointer = { x: 0, y: 0 }
    const onMove = (e: PointerEvent) => {
      pointer.x = (e.clientX / innerWidth) * 2 - 1
      pointer.y = (e.clientY / innerHeight) * 2 - 1
    }
    if (!reduce) addEventListener('pointermove', onMove, { passive: true })

    let visible = true
    let raf = 0
    const t0 = performance.now()
    let last = t0
    function frame(now: number) {
      const t = (now - t0) / 1000
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now
      const slide = reduce ? 1 : easeOut((t - 0.35) / 1.5)
      record.position.x = 0.15 + 0.9 * slide
      if (!reduce) {
        disc.rotation.y -= dt * 1.1
        sheen.rotation.z = Math.sin(t * 0.35) * 0.9
        rig.rotation.x += (base.x + pointer.y * 0.12 - rig.rotation.x) * 0.06
        rig.rotation.y += (base.y + pointer.x * 0.22 - rig.rotation.y) * 0.06
        rig.position.y = Math.sin(t * 0.9) * 0.04
      }
      renderer.render(scene, camera)
      if (!reduce && visible && !document.hidden) raf = requestAnimationFrame(frame)
      else raf = 0
    }
    const kick = () => {
      if (!raf && !reduce) {
        last = performance.now()
        raf = requestAnimationFrame(frame)
      }
    }
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting
      kick()
    })
    io.observe(el)
    document.addEventListener('visibilitychange', kick)
    raf = requestAnimationFrame(frame)

    // a fonte da capa e do selo entra depois: redesenha as texturas quando ela chegar
    document.fonts?.load('800 100px "Archivo Variable"').then(() => {
      for (const m of [grooves, sleeveMap]) m.dispose()
      grooves.image = grooveTexture().image
      sleeveMap.image = sleeveTexture().image
      grooves.needsUpdate = sleeveMap.needsUpdate = true
      if (reduce) frame(performance.now())
    })

    return () => {
      cancelAnimationFrame(raf)
      raf = 0
      io.disconnect()
      ro.disconnect()
      removeEventListener('pointermove', onMove)
      document.removeEventListener('visibilitychange', kick)
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.geometry.dispose()
          for (const m of Array.isArray(o.material) ? o.material : [o.material]) m.dispose()
        }
      })
      for (const t of [grooves, sheenMap, sleeveMap]) t.dispose()
      renderer.dispose()
      renderer.domElement.remove()
    }
  }, [])

  return <div ref={host} aria-hidden className="absolute inset-0" />
}
