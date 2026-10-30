// Service worker LAKERS STORE : reçoit les notifications push du serveur et
// les affiche, même quand l'onglet du site est fermé.

// Réception d'une notification poussée par l'Edge Function notify-admin
self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch (err) {
    data = { body: event.data ? event.data.text() : '' }
  }

  const title = data.title || 'LAKERS STORE'
  const options = {
    body: data.body || '',
    tag: data.tag || 'lakers-store',
    data: { url: data.url || '/' }
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

// Clic sur la notification : on ouvre (ou on ramène au premier plan) la page visée
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const cible = event.notification.data?.url || '/'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((fenetres) => {
      for (const fenetre of fenetres) {
        if (fenetre.url.includes(cible) && 'focus' in fenetre) return fenetre.focus()
      }
      if (self.clients.openWindow) return self.clients.openWindow(cible)
      return undefined
    })
  )
})
