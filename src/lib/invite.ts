// O id do grupo é um UUID. No link de convite ele vai sem hifens: os apps de chat quebram a linha nos hifens
// e deixam só um pedaço do link tocável. As telas e a busca aceitam os dois formatos.
const GROUP_CODE = /(?<![0-9a-f])([0-9a-f]{8})-?([0-9a-f]{4})-?([0-9a-f]{4})-?([0-9a-f]{4})-?([0-9a-f]{12})(?![0-9a-f])/i

// acha o id em qualquer texto (código puro, link ou a mensagem de convite inteira) e devolve o UUID com hifens
export const parseGroupId = (text: string) => {
  const m = text.match(GROUP_CODE)
  return m ? m.slice(1).join('-').toLowerCase() : null
}

export const inviteLink = (origin: string, id: string) => `${origin}/g/${id.replaceAll('-', '')}`

// o link fica sozinho na última linha: nada colado nele, para o app de chat reconhecer o link inteiro
export const inviteMessage = (origin: string, id: string, name: string) =>
  `Bora ouvir um disco juntos? Entra no grupo “${name}” no Disco da Vez:\n${inviteLink(origin, id)}`
