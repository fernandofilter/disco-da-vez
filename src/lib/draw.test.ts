import { describe, expect, it } from 'vitest'
import { buildTape, pickAlbums, seeded, type Candidate } from './draw'
import { dedupeAlbums, normalizeTitle, usable } from './musicbrainz'
import type { Album, Choice } from './types'

const album = (id: string, artist = 'X'): Album => ({ id, title: id, artist })
const cand = (id: string): Candidate => ({ key: id, resolve: async () => album(id) })
const ch = (id: string): Choice => ({ id, name: id })

describe('pickAlbums', () => {
  it('dá a mesma chance a cada membro, independente do tamanho do pool', async () => {
    const pools: Record<string, Candidate[]> = {
      a: Array.from({ length: 50 }, (_, i) => cand(`a${i}`)),
      b: [cand('b0')],
    }
    const rng = seeded('peso')
    let fromB = 0
    for (let i = 0; i < 400; i++) {
      const { albums } = await pickAlbums(
        { members: [{ id: 'm1', choices: [ch('a')] }, { id: 'm2', choices: [ch('b')] }], pool: async (c) => pools[c.id], accept: async () => true, exclude: new Set(), rng },
        1,
      )
      if (albums[0].id === 'b0') fromB++
    }
    expect(fromB / 400).toBeGreaterThan(0.4)
    expect(fromB / 400).toBeLessThan(0.6)
  })

  it('ignora o histórico e os álbuns rejeitados (escutados / sem capa)', async () => {
    const { albums } = await pickAlbums(
      {
        members: [{ id: 'm', choices: [ch('p')] }],
        pool: async () => ['h', 'listened', 'ok'].map(cand),
        accept: async (a) => a.id !== 'listened',
        exclude: new Set(['h']),
      },
      3,
    )
    expect(albums.map((a) => a.id)).toEqual(['ok'])
  })

  it('para votação devolve álbuns distintos', async () => {
    const { albums } = await pickAlbums(
      { members: [{ id: 'm', choices: [ch('p')] }], pool: async () => Array.from({ length: 10 }, (_, i) => cand(`z${i}`)), accept: async () => true, exclude: new Set() },
      6,
    )
    expect(new Set(albums.map((a) => a.id)).size).toBe(6)
  })

  it('cai para outra escolha quando uma não rende nada', async () => {
    const { albums } = await pickAlbums(
      { members: [{ id: 'm', choices: [ch('empty'), ch('full')] }], pool: async (c) => (c.id === 'full' ? [cand('f1')] : []), accept: async () => true, exclude: new Set() },
      1,
    )
    expect(albums[0].id).toBe('f1')
  })
})

describe('versões do mesmo álbum', () => {
  it('normaliza remaster/deluxe e fica com o lançamento mais antigo', () => {
    expect(normalizeTitle('Abbey Road (2019 Remaster)')).toBe(normalizeTitle('Abbey Road'))
    expect(normalizeTitle('OK Computer – Deluxe Edition')).toBe(normalizeTitle('OK Computer'))
    const out = dedupeAlbums([
      { id: '2', title: 'Nevermind (Remastered)', artist: 'Nirvana', year: '2011' },
      { id: '1', title: 'Nevermind', artist: 'Nirvana', year: '1991' },
    ])
    expect(out.map((a) => a.id)).toEqual(['1'])
  })
})

describe('só álbum de estúdio', () => {
  const rg = (title: string, extra: { 'secondary-types'?: string[]; 'first-release-date'?: string } = {}) => ({ title, 'first-release-date': '1999', ...extra })
  it('aceita disco de estúdio e títulos com "live" no meio', () => {
    expect(usable(rg('OK Computer'))).toBe(true)
    expect(usable(rg('Live Through This'))).toBe(true)
  })
  it('recusa ao vivo, coletânea, trilha, remix e títulos de coletânea sem marcação', () => {
    for (const t of ['Live', 'Compilation', 'Soundtrack', 'Remix', 'Demo']) expect(usable(rg('X', { 'secondary-types': [t] }))).toBe(false)
    for (const t of ['Greatest Hits', 'MTV Unplugged in New York', 'Live at Reading', 'The Best of Queen']) expect(usable(rg(t))).toBe(false)
    expect(usable(rg('Sem data', { 'first-release-date': '' }))).toBe(false)
  })
})

describe('buildTape', () => {
  const pool = Array.from({ length: 13 }, (_, i) => album(`a${i}`))
  const winner = album('w')
  const tape = buildTape(pool, winner, 58, 46, seeded('fita'))

  it('põe o vencedor no ponto de parada e preenche a fita toda', () => {
    expect(tape).toHaveLength(58)
    expect(tape[46].id).toBe('w')
  })

  it('não repete capa colada nem em sequência curta (nada de ciclo óbvio)', () => {
    for (let i = 1; i < tape.length; i++) for (let k = 1; k <= 4; k++) if (i - k >= 0) expect(tape[i].id).not.toBe(tape[i - k].id)
  })

  it('mostra o vencedor também em outros pontos, mas nunca ao lado do ponto de parada', () => {
    expect(tape.filter((a) => a.id === 'w').length).toBeGreaterThan(1)
    expect(tape[45].id).not.toBe('w')
    expect(tape[47].id).not.toBe('w')
  })

  it('com 2 álbuns (empate) alterna só entre eles; com 1 usa capas em branco', () => {
    const t = buildTape([album('x')], winner, 20, 10, seeded('t'))
    expect(new Set(t.map((a) => a.id))).toEqual(new Set(['x', 'w']))
    expect(buildTape([], winner, 20, 10, seeded('t')).filter((a) => a.id.startsWith('ph'))).toHaveLength(19)
  })
})
