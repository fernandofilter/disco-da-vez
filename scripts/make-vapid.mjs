// Gera o par de chaves VAPID dos avisos no celular (Web Push), sem dependências: `node scripts/make-vapid.mjs`
// - VAPID_KEYS (as duas chaves em JWK) vai para os segredos da Edge Function `push` e não sai de lá;
// - VITE_VAPID_PUBLIC_KEY (só a pública, em base64url) vai para o .env e para a Vercel: o navegador precisa dela para se inscrever.
// Trocar as chaves invalida todas as inscrições: cada pessoa precisa ligar o sino de novo.
const { subtle } = globalThis.crypto

const keys = await subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify'])
const jwk = { publicKey: await subtle.exportKey('jwk', keys.publicKey), privateKey: await subtle.exportKey('jwk', keys.privateKey) }
const raw = Buffer.from(await subtle.exportKey('raw', keys.publicKey)).toString('base64url')

console.log(`# Edge Function (supabase secrets set ...):
VAPID_KEYS='${JSON.stringify(jwk)}'

# .env e Vercel:
VITE_VAPID_PUBLIC_KEY=${raw}`)
