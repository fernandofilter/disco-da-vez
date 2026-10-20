import { describe, expect, it } from 'vitest'
import { memo } from './cache'

describe('memo', () => {
  it('chama a rede uma vez por chave, mesmo sem localStorage', async () => {
    const map = new Map<string, Promise<number>>()
    let calls = 0
    const load = async () => ++calls
    expect(await memo(map, 'k', load)).toBe(1)
    expect(await memo(map, 'k', load)).toBe(1)
    expect(calls).toBe(1)
  })

  it('esquece a chave que falhou, para tentar de novo', async () => {
    const map = new Map<string, Promise<number>>()
    await expect(memo(map, 'x', async () => Promise.reject(new Error('503')))).rejects.toThrow()
    expect(await memo(map, 'x', async () => 7)).toBe(7)
  })
})
