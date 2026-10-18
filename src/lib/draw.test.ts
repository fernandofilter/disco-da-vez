import { describe, expect, it } from 'vitest'
import { pickAlbums, seeded, type Candidate } from './draw'
import { dedupeAlbums, normalizeTitle } from './musicbrainz'
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
