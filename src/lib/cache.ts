// Cache no navegador das respostas do MusicBrainz / Cover Art Archive que não mudam (discografias, faixas, capas):
// o mesmo grupo escolhe as mesmas bandas rodada após rodada, e cada resposta custa 1 a 3 s por causa do limite de 1 req/s.
// Só guarda dado (nunca o resultado de um sorteio): a aleatoriedade continua sendo feita em cima da lista.
const PREFIX = 'album-sort:cache:v1:'
const TTL_MS = 14 * 86_400_000

export function readCache<T>(key: string): T | undefined {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    if (!raw) return undefined
    const { t, v } = JSON.parse(raw) as { t: number; v: T }
    if (Date.now() - t < TTL_MS) return v
    localStorage.removeItem(PREFIX + key)
  } catch {
    /* storage bloqueado ou entrada corrompida: é só um cache */
  }
  return undefined
}

export function writeCache(key: string, v: unknown) {
  const put = () => localStorage.setItem(PREFIX + key, JSON.stringify({ t: Date.now(), v }))
  try {
    put()
  } catch {
    // cheio: joga fora o cache inteiro e tenta de novo uma vez
    try {
      Object.keys(localStorage).filter((k) => k.startsWith(PREFIX)).forEach((k) => localStorage.removeItem(k))
      put()
    } catch {
      /* sem espaço ou sem storage: segue sem cache */
    }
  }
}

/** Resolve `load` uma vez por chave: memória primeiro, depois o cache do navegador, depois a rede (e grava). */
export function memo<T>(map: Map<string, Promise<T>>, key: string, load: () => Promise<T>, persist: (v: T) => boolean = () => true): Promise<T> {
  let p = map.get(key)
  if (!p) {
    const hit = readCache<T>(key)
    p = hit !== undefined ? Promise.resolve(hit) : load().then((v) => (persist(v) && writeCache(key, v), v))
    p.catch(() => map.delete(key))
    map.set(key, p)
  }
  return p
}
