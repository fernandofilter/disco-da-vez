// Service worker dos avisos no celular (Web Push). Só cuida de push: não guarda nada em cache, o app continua online.
// O payload vem da Edge Function `push`: { title, body, url, tag }.

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))

self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { body: event.data ? event.data.text() : '' }
  }
  const url = data.url || '/'
  // O aviso SEMPRE aparece, dentro do waitUntil: push sem notificação faz o Safari/iOS cancelar a inscrição.
  // Quem está com o grupo aberto e em foco já está vendo a rodada: o aviso sai mudo e fecha na hora.
  event.waitUntil(
    (async () => {
      const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      const watching = wins.some((c) => c.focused && new URL(c.url).pathname === url)
      await self.registration.showNotification(data.title || 'Disco da Vez', {
        body: data.body || '',
        tag: data.tag,
        renotify: Boolean(data.tag) && !watching,
        silent: watching,
        icon: '/icon-192.png',
        data: { url },
      })
      if (watching) (await self.registration.getNotifications({ tag: data.tag })).forEach((n) => n.close())
    })(),
  )
})

// tocar no aviso: volta para a aba do grupo se ela existe, senão abre o grupo
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const target = new URL(event.notification.data?.url || '/', self.location.origin)
  event.waitUntil(
    (async () => {
      const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      const same = wins.find((c) => new URL(c.url).pathname === target.pathname)
      if (same) return same.focus()
      const any = wins.find((c) => 'navigate' in c)
      if (any) return any.navigate(target.href).then((c) => (c || any).focus())
      return self.clients.openWindow(target.href)
    })(),
  )
})
