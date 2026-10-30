// Bouton d'activation / désactivation des notifications push du navigateur.
// S'affiche uniquement pour un utilisateur connecté, sur un navigateur compatible.

import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  getExistingSubscription,
  isPushSupported,
  notificationPermission,
  subscribeToPush,
  unsubscribeFromPush
} from '../lib/push'
import { Spinner } from './ui'
import { IconBell } from './icons'

export default function NotificationToggle({ compact = false, className = '' }) {
  const { user } = useAuth()

  const [supported, setSupported] = useState(false)
  const [ready, setReady] = useState(false)
  const [subscribed, setSubscribed] = useState(false)
  const [denied, setDenied] = useState(false)
  const [busy, setBusy] = useState(false)

  // Détermine l'état initial : compatibilité, autorisation, abonnement existant
  useEffect(() => {
    let active = true

    async function initialiser() {
      if (!isPushSupported()) {
        if (active) setReady(true)
        return
      }
      if (active) setSupported(true)
      if (notificationPermission() === 'denied' && active) setDenied(true)

      try {
        const abonnement = await getExistingSubscription()
        if (active) setSubscribed(Boolean(abonnement))
      } catch (err) {
        // Un échec de lecture ne doit pas casser la page
        console.warn('Lecture de l’abonnement push impossible :', err)
      } finally {
        if (active) setReady(true)
      }
    }

    initialiser()
    return () => {
      active = false
    }
  }, [user?.id])

  const basculer = useCallback(async () => {
    setBusy(true)
    try {
      if (subscribed) {
        await unsubscribeFromPush()
        setSubscribed(false)
      } else {
        await subscribeToPush(user.id)
        setSubscribed(true)
      }
    } catch (err) {
      window.alert(err.message || 'Action impossible pour le moment.')
      if (notificationPermission() === 'denied') setDenied(true)
    } finally {
      setBusy(false)
    }
  }, [subscribed, user])

  // Rien à afficher : visiteur non connecté, navigateur non compatible ou pas encore prêt
  if (!user || !ready || !supported) return null

  const label = subscribed ? 'Notifications activées' : 'Activer les notifications'

  // Version compacte : simple icône pour la barre d'en-tête
  if (compact) {
    return (
      <button
        type="button"
        onClick={basculer}
        disabled={busy || denied}
        title={
          denied
            ? 'Notifications bloquées dans les réglages de votre navigateur'
            : label
        }
        aria-label={label}
        className={`grid h-10 w-10 place-items-center rounded-xl transition-colors disabled:opacity-50 ${
          subscribed ? 'bg-brand-100 text-brand-700' : 'text-slate-500 hover:text-brand-700'
        } ${className}`}
      >
        {busy ? <Spinner className="h-5 w-5" /> : <IconBell filled={subscribed} />}
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={basculer}
      disabled={busy || denied}
      className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-colors disabled:opacity-50 ${
        subscribed ? 'bg-brand-50 text-brand-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
      } ${className}`}
    >
      {busy ? <Spinner className="h-4 w-4" /> : <IconBell filled={subscribed} className="h-5 w-5" />}
      {denied ? 'Notifications bloquées par le navigateur' : label}
    </button>
  )
}
