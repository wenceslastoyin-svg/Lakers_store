// Envoi de notifications push navigateur (Web Push) aux abonnements d'un
// utilisateur. Les clés VAPID proviennent des variables d'environnement de
// l'Edge Function (voir SETUP.md, section « Notifications push »).

import webpush from 'npm:web-push@3.6.7'

const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY') ?? ''
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY') ?? ''
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:admin@lakersstore.bj'

// La configuration VAPID n'est appliquée qu'une seule fois par instance
let configure = false

function pret(): boolean {
  if (configure) return true
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.warn('Web Push non configuré : notification ignorée.')
    return false
  }
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)
  configure = true
  return true
}

export interface PushPayload {
  title: string
  body?: string
  url?: string
  tag?: string
}

/**
 * Envoie une notification push à tous les appareils abonnés d'un utilisateur.
 * @param admin   client Supabase « service role »
 * @param userId  destinataire
 * @param payload contenu de la notification
 * @returns true si au moins un envoi a réussi
 */
export async function sendPushToUser(
  admin: any,
  userId: string,
  payload: PushPayload
): Promise<boolean> {
  if (!userId) return false
  if (!pret()) return false

  const { data: abonnements, error } = await admin
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('user_id', userId)

  if (error) {
    console.error('Lecture des abonnements push impossible :', error.message)
    return false
  }
  if (!abonnements?.length) return false

  let succes = false

  for (const abonnement of abonnements) {
    try {
      await webpush.sendNotification(
        {
          endpoint: abonnement.endpoint,
          keys: { p256dh: abonnement.p256dh, auth: abonnement.auth }
        },
        JSON.stringify(payload)
      )
      succes = true
    } catch (error: any) {
      // 404 / 410 : l'abonnement n'est plus valide (appareil désinscrit) -> on le supprime
      const statut = error?.statusCode
      if (statut === 404 || statut === 410) {
        await admin.from('push_subscriptions').delete().eq('id', abonnement.id)
      } else {
        console.error('Échec de l’envoi Web Push :', error?.message ?? error)
      }
    }
  }

  return succes
}
