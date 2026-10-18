// Gera src/data/genres.json a partir da lista oficial de gêneros do MusicBrainz (rodar manualmente quando quiser atualizar).
import { writeFileSync } from 'node:fs'

const UA = { 'User-Agent': 'album-sort/0.1 (contato@q2f.com.br)' }
const sleep = (ms) => new Promise((res) => setTimeout(res, ms))
const names = []
for (let offset = 0; ; offset += 100) {
  let page
  for (let attempt = 0; attempt < 6 && !page; attempt++) {
    const r = await fetch(`https://musicbrainz.org/ws/2/genre/all?fmt=json&limit=100&offset=${offset}`, { headers: UA })
    if (r.ok) page = await r.json()
    else await sleep(3000 * (attempt + 1)) // 503 = rate limit
  }
  if (!page) throw new Error(`MusicBrainz falhou no offset ${offset}`)
  if (!page.genres.length) break
  names.push(...page.genres.map((g) => g.name))
  console.log(names.length)
  await sleep(1500)
}
writeFileSync(new URL('../src/data/genres.json', import.meta.url), JSON.stringify(names.sort()))
