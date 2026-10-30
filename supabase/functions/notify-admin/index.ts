// Edge Function : notify-admin
// Reçoit les webhooks de la base (nouvelle annonce, nouvelle demande d'achat,
// paiement confirmé) et prévient l'administrateur par e-mail (Resend) et par
// WhatsApp (CallMeBot).
//
// Deux façons de la déclencher :
//   1. Database Webhooks du tableau de bord Supabase (recommandé)
//   2. Déclencheurs SQL pg_net du fichier 0002_notifications_optionnel.sql

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, json } from '../_shared/cors.ts'
import { emailLayout, escapeHtml, sendEmail, sendWhatsApp } from '../_shared/notify.ts'
import { sendPushToUser } from '../_shared/push.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const WEBHOOK_SECRET = Deno.env.get('WEBHOOK_SECRET') ?? ''
const APP_URL = Deno.env.get('APP_URL') ?? ''

// Client « service role » : contourne les règles RLS, réservé au serveur
const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

const fcfa = (n) =>
  n === null || n === undefined ? '—' : `${Number(n).toLocaleString('fr-FR')} FCFA`

const CONDITION_LABELS = {
  neuf: 'Neuf',
  comme_neuf: 'Comme neuf',
  bon_etat: 'Bon état',
  a_reparer: 'À réparer'
}

Deno.serve(async (req) => {
  // Pré-vol CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Vérification du secret partagé (empêche un tiers de déclencher les envois)
    if (WEBHOOK_SECRET && req.headers.get('x-webhook-secret') !== WEBHOOK_SECRET) {
      return json({ error: 'Signature invalide.' }, 401)
    }

    const body = await req.json()
    const table = body?.table ?? body?.record?.table
    const type = body?.type ?? 'INSERT'
    const record = body?.record ?? body?.new ?? {}

    if (table === 'phones' && type === 'INSERT') {
      await notifierNouvelleAnnonce(record, 'email')
      await notifierNouvelleAnnonce(record, 'whatsapp')
      return json({ ok: true, type: 'nouvelle_annonce' })
    }

    if (table === 'purchase_requests' && type === 'INSERT') {
      await notifierNouvelleDemande(record, 'email')
      await notifierNouvelleDemande(record, 'whatsapp')
      return json({ ok: true, type: 'nouvelle_demande' })
    }

    // Modération d'une annonce : on prévient le vendeur (notification navigateur)
    if (table === 'phones' && type === 'UPDATE') {
      const ancien = body?.old_record ?? body?.old ?? {}
      if (
        record.status !== ancien.status &&
        (record.status === 'validee' || record.status === 'refusee')
      ) {
        await notifierStatutAnnonce(record)
        return json({ ok: true, type: 'statut_annonce' })
      }
      return json({ ok: true, ignored: true })
    }

    // Paiement : on prévient l'administrateur et l'acheteur
    if (table === 'purchase_requests' && type === 'UPDATE') {
      const ancien = body?.old_record ?? body?.old ?? {}

      if (record.payment_status === 'paye' && ancien.payment_status !== 'paye') {
        await notifierPaiementConfirme(record, 'email')
        await notifierPaiementConfirme(record, 'whatsapp')
        await notifierAcheteurPaiement(record, 'paye')
        return json({ ok: true, type: 'paiement_confirme' })
      }

      if (record.payment_status === 'echoue' && ancien.payment_status !== 'echoue') {
        await notifierAcheteurPaiement(record, 'echoue')
        return json({ ok: true, type: 'paiement_echoue' })
      }

      return json({ ok: true, ignored: true })
    }

    return json({ ok: true, ignored: true })
  } catch (error) {
    console.error('notify-admin :', error)
    return json({ error: error.message }, 500)
  }
})

// ---------------------------------------------------------------------------
// 1. Nouvelle annonce -> toutes les infos du téléphone + coordonnées du vendeur
// ---------------------------------------------------------------------------
async function notifierNouvelleAnnonce(phone, channel) {
  const { data: vendeur } = await admin
    .from('profiles')
    .select('full_name, email, phone, whatsapp')
    .eq('id', phone.seller_id)
    .maybeSingle()

  const titre = `${phone.brand} ${phone.model} — ${fcfa(phone.price)}`
  const lien = APP_URL ? `${APP_URL}/telephone/${phone.id}` : ''

  const rows = [
    ['Marque', escapeHtml(phone.brand)],
    ['Modèle', escapeHtml(phone.model)],
    ['État', CONDITION_LABELS[phone.condition] ?? phone.condition],
    ['Stockage', escapeHtml(phone.storage)],
    ['RAM', escapeHtml(phone.ram)],
    ['Couleur', escapeHtml(phone.color)],
    ['Accessoires', escapeHtml(phone.accessories)],
    ['Problèmes', escapeHtml(phone.issues)],
    ['Ville', escapeHtml(phone.city)],
    ['Prix demandé', `<span style="color:#0a914c">${fcfa(phone.price)}</span>`],
    ['Description', escapeHtml(phone.description)],
    ['Vendeur', escapeHtml(vendeur?.full_name)],
    ['E-mail vendeur', escapeHtml(vendeur?.email)],
    ['Téléphone vendeur', escapeHtml(vendeur?.phone)],
    ['WhatsApp vendeur', escapeHtml(vendeur?.whatsapp)]
  ]

  const texte =
    `🆕 NOUVELLE ANNONCE à valider\n` +
    `${titre}\n` +
    `État : ${CONDITION_LABELS[phone.condition] ?? phone.condition}\n` +
    `Ville : ${phone.city}\n` +
    `Vendeur : ${vendeur?.full_name ?? '—'}\n` +
    `Téléphone : ${vendeur?.phone ?? '—'}\n` +
    `WhatsApp : ${vendeur?.whatsapp ?? '—'}\n` +
    (lien ? `Lien : ${lien}\n` : '') +
    `À valider dans l’espace administrateur.`

  await enregistrer(channel, 'nouvelle_annonce', phone.id, () =>
    channel === 'email'
      ? sendEmail({
          subject: `[LAKERS STORE] Nouvelle annonce à valider — ${phone.brand} ${phone.model}`,
          html: emailLayout('Nouvelle annonce à valider', rows, lien ? `Voir l’annonce : ${lien}` : '')
        })
      : sendWhatsApp(texte)
  )
}

// ---------------------------------------------------------------------------
// 2. Nouvelle demande d'achat -> qui veut quel téléphone, à quel prix
// ---------------------------------------------------------------------------
async function notifierNouvelleDemande(request, channel) {
  const { data: phone } = await admin
    .from('phones')
    .select('id, brand, model, price, city, seller_id')
    .eq('id', request.phone_id)
    .maybeSingle()

  const titre = phone ? `${phone.brand} ${phone.model}` : 'Téléphone supprimé'
  const prix = phone?.price ?? request.payment_amount
  const lien = phone?.id && APP_URL ? `${APP_URL}/telephone/${phone.id}` : ''
  const intention =
    request.intent === 'payer_maintenant'
      ? 'Veut payer maintenant (mobile money)'
      : 'Veut d’abord discuter'

  const rows = [
    ['Client', escapeHtml(request.buyer_name)],
    ['WhatsApp client', escapeHtml(request.buyer_whatsapp)],
    ['Téléphone visé', escapeHtml(titre)],
    ['Prix', fcfa(prix)],
    ['Ville du téléphone', escapeHtml(phone?.city)],
    ['Intention', intention],
    ['Message', escapeHtml(request.message) || '—'],
    ['Statut du paiement', request.payment_status],
    ['Lien de l’annonce', lien || '—']
  ]

  const texte =
    `🛒 NOUVELLE DEMANDE D’ACHAT\n` +
    `Le client ${request.buyer_name} veut le téléphone ${titre} (${fcfa(prix)}).\n` +
    `Son numéro WhatsApp est ${request.buyer_whatsapp}.\n` +
    `Il ${request.intent === 'payer_maintenant' ? 'veut payer maintenant' : 'veut d’abord discuter'}.` +
    (request.message ? `\nMessage : ${request.message}` : '') +
    (lien ? `\nAnnonce : ${lien}` : '')

  await enregistrer(channel, 'nouvelle_demande', request.id, () =>
    channel === 'email'
      ? sendEmail({
          subject: `[LAKERS STORE] Nouvelle demande d’achat — ${titre}`,
          html: emailLayout('Nouvelle demande d’achat', rows, lien ? `Voir l’annonce : ${lien}` : '')
        })
      : sendWhatsApp(texte)
  )
}

// ---------------------------------------------------------------------------
// 3. Paiement confirmé
// ---------------------------------------------------------------------------
async function notifierPaiementConfirme(request, channel) {
  const { data: phone } = await admin
    .from('phones')
    .select('id, brand, model, price')
    .eq('id', request.phone_id)
    .maybeSingle()

  const titre = phone ? `${phone.brand} ${phone.model}` : 'Téléphone'
  const montant = request.payment_amount ?? phone?.price

  const rows = [
    ['Statut', '<span style="color:#0a914c">PAYÉ</span>'],
    ['Montant', fcfa(montant)],
    ['Téléphone', escapeHtml(titre)],
    ['Client', escapeHtml(request.buyer_name)],
    ['WhatsApp client', escapeHtml(request.buyer_whatsapp)],
    ['Fournisseur', escapeHtml(request.payment_provider)],
    ['Référence', escapeHtml(request.payment_reference)]
  ]

  const texte =
    `✅ PAIEMENT CONFIRMÉ\n` +
    `${fcfa(montant)} pour ${titre}\n` +
    `Client : ${request.buyer_name} (${request.buyer_whatsapp})\n` +
    `Référence : ${request.payment_reference ?? '—'}`

  await enregistrer(channel, 'paiement_confirme', request.id, () =>
    channel === 'email'
      ? sendEmail({
          subject: `[LAKERS STORE] Paiement confirmé — ${fcfa(montant)}`,
          html: emailLayout('Paiement confirmé', rows)
        })
      : sendWhatsApp(texte)
  )
}

// ---------------------------------------------------------------------------
// 4. Annonce validée / refusée -> notification navigateur au vendeur
// ---------------------------------------------------------------------------
async function notifierStatutAnnonce(phone) {
  const validee = phone.status === 'validee'
  const titre = `${phone.brand} ${phone.model}`

  const payload = {
    title: validee ? 'Annonce validée' : 'Annonce refusée',
    body: validee
      ? `Votre annonce ${titre} est maintenant en ligne sur LAKERS STORE.`
      : `Votre annonce ${titre} a été refusée. Modifiez-la puis republiez-la.`,
    url: validee
      ? APP_URL
        ? `${APP_URL}/telephone/${phone.id}`
        : '/'
      : APP_URL
        ? `${APP_URL}/mes-annonces`
        : '/'
  }

  await enregistrer('push', validee ? 'annonce_validee' : 'annonce_refusee', phone.id, async () => {
    const ok = await sendPushToUser(admin, phone.seller_id, payload)
    return { ok, reason: ok ? undefined : 'aucun_abonnement' }
  })
}

// ---------------------------------------------------------------------------
// 5. Paiement de l'acheteur (payé ou échoué) -> notification navigateur
// ---------------------------------------------------------------------------
async function notifierAcheteurPaiement(request, statut) {
  if (!request.buyer_id) return

  const { data: phone } = await admin
    .from('phones')
    .select('brand, model')
    .eq('id', request.phone_id)
    .maybeSingle()

  const titre = phone ? `${phone.brand} ${phone.model}` : 'votre téléphone'
  const paye = statut === 'paye'

  const payload = {
    title: paye ? 'Paiement confirmé' : 'Paiement échoué',
    body: paye
      ? `Nous avons bien reçu votre paiement pour ${titre}. L’administrateur vous contacte pour la remise.`
      : `Votre paiement pour ${titre} n’a pas abouti. Vous pouvez réessayer depuis « Mes demandes d’achat ».`,
    url: APP_URL ? `${APP_URL}/mes-demandes` : '/'
  }

  await enregistrer('push', paye ? 'paiement_confirme' : 'paiement_echoue', request.id, async () => {
    const ok = await sendPushToUser(admin, request.buyer_id, payload)
    return { ok, reason: ok ? undefined : 'aucun_abonnement' }
  })
}

// ---------------------------------------------------------------------------
// Journalise chaque notification dans la table notifications_log
// ---------------------------------------------------------------------------
async function enregistrer(channel, type, referenceId, envoyer) {
  let resultat = { ok: false }
  try {
    resultat = await envoyer()
  } catch (error) {
    console.error(`Notification ${channel}/${type} :`, error)
    resultat = { ok: false, reason: error.message }
  }

  await admin.from('notifications_log').insert({
    type,
    channel,
    payload: { reference_id: referenceId, ok: resultat.ok, reason: resultat.reason ?? null },
    status: resultat.ok ? 'envoye' : 'erreur'
  })

  return resultat
}
