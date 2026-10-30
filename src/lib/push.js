// Notifications push du navigateur (Web Push).
// Le navigateur crée un « abonnement » (endpoint + 2 clés) qu'on enregistre en
// base ; l'Edge Function notify-admin s'en sert pour prévenir l'utilisateur.

import { deletePushSubscription, savePushSubscription } from './api'

// Clé publique VAPID (à définir dans .env : VITE_VAPID_PUBLIC_KEY)
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || ''

// Le navigateur sait-il gérer les notifications push ?
export function isPushSupported() {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

// État de l'autorisation : 'default' | 'granted' | 'denied'
export function notificationPermission() {
  if (typeof Notification === 'undefined') return 'denied'
  return Notification.permission
}

// Convertit la clé VAPID (base64 URL) en tableau d'octets attendu par l'API Push
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const output = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i += 1) output[i] = rawData.charCodeAt(i)
  return output
}

// Renvoie l'abonnement push existant du navigateur (ou null)
export async function getExistingSubscription() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return null
  const registration = await navigator.serviceWorker.ready
  return registration.pushManager.getSubscription()
}

// Demande l'autorisation puis crée et enregistre l'abonnement en base
export async function subscribeToPush(userId) {
  if (!userId) throw new Error('Vous devez être connecté.')
  if (!isPushSupported()) {
    throw new Error('Les notifications ne sont pas prises en charge par ce navigateur.')
  }
  if (!VAPID_PUBLIC_KEY) {
    throw new Error('Les notifications ne sont pas encore configurées sur ce site.')
  }

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    throw new Error('Vous avez refusé les notifications.')
  }

  // Enregistre le service worker (fichier public/sw.js).
  // BASE_URL tient compte d'un éventuel sous-dossier (GitHub Pages).
  await navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`)
  const registration = await navigator.serviceWorker.ready

  let subscription = await registration.pushManager.getSubscription()
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
    })
  }

  const json = subscription.toJSON()
  await savePushSubscription(userId, json)
  return json
}

// Supprime l'abonnement (côté navigateur et côté base)
export async function unsubscribeFromPush() {
  const subscription = await getExistingSubscription()
  if (!subscription) return

  const endpoint = subscription.endpoint
  await subscription.unsubscribe()
  await deletePushSubscription(endpoint) // ignore si la ligne n'existe plus côté serveur
}
