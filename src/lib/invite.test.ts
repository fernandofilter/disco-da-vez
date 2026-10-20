import { describe, expect, it } from 'vitest'
import { inviteLink, inviteMessage, parseGroupId } from './invite'

const ID = '5d3a71a5-8c75-4c56-a71d-ff041c50dc8d'

describe('invite', () => {
  it('monta o link sem hifens, para não quebrar linha no meio', () => {
    expect(inviteLink('https://disco.fltr.com.br', ID)).toBe('https://disco.fltr.com.br/g/5d3a71a58c754c56a71dff041c50dc8d')
  })

  it('deixa o link sozinho na última linha da mensagem', () => {
    const lines = inviteMessage('https://disco.fltr.com.br', ID, 'Sexta do vinil').split('\n')
    expect(lines).toHaveLength(2)
    expect(lines[0]).toContain('Sexta do vinil')
    expect(lines[1]).toBe(inviteLink('https://disco.fltr.com.br', ID))
  })

  it('lê o id em qualquer formato: código, link antigo, link novo e mensagem inteira', () => {
    expect(parseGroupId(ID)).toBe(ID)
    expect(parseGroupId(ID.toUpperCase())).toBe(ID)
    expect(parseGroupId(`https://disco.fltr.com.br/g/${ID}`)).toBe(ID)
    expect(parseGroupId(inviteLink('https://disco.fltr.com.br', ID))).toBe(ID)
    expect(parseGroupId(inviteMessage('https://disco.fltr.com.br', ID, 'Sexta do vinil'))).toBe(ID)
  })

  it('ignora texto que não é um id', () => {
    expect(parseGroupId('')).toBeNull()
    expect(parseGroupId('5d3a71a5-8c75-4c56-a71d')).toBeNull()
    expect(parseGroupId(`${ID}0`)).toBeNull()
  })
})
