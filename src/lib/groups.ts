// Atalhos dos grupos que este aparelho já abriu (o servidor é a fonte da verdade; aqui só guardamos id e nome).
const KEY = 'album-sort:groups'

export const savedGroups = (): { id: string; name: string }[] => {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]')
  } catch {
    return []
  }
}

const store = (list: { id: string; name: string }[]) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(list))
  } catch {
    /* storage bloqueado: só perde a lista de atalhos */
  }
}

export const rememberGroup = (id: string, name: string) => store([{ id, name }, ...savedGroups().filter((g) => g.id !== id)].slice(0, 12))
export const forgetGroup = (id: string) => store(savedGroups().filter((g) => g.id !== id))
