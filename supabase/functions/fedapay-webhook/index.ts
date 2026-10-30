// Edge Function : fedapay-webhook
// Point d'entrée appelé par FedaPay pour annoncer le résultat d'un paiement.
// Il met à jour le statut du paiement dans la table purchase_requests.
// (La notification e-mail / WhatsApp de l'administrateur est ensuite déclenchée
//  par le webhook de base de données sur cette mise à jour.)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, json } from '../_shared/cors.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const FEDAPAY_WEBHOOK_SECRET = Deno.env.get('FEDAPAY_WEBHOOK_SECRET') ?? ''

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

// Correspondance entre les évènements FedaPay et nos statuts de paiement
const STATUTS = {
  'transaction.approved': 'paye',
  'transaction.transferred': 'paye',
  'transaction.declined': 'echoue',
  'transaction.canceled': 'echoue',
  'transaction.refunded': 'echoue'
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const brut = await req.text()

    // Vérification de la signature HMAC envoyée par FedaPay
    if (FEDAPAY_WEBHOOK_SECRET) {
      const signature = req.headers.get('x-fedapay-signature') ?? ''
      const valide = await verifierSignature(brut, signature, FEDAPAY_WEBHOOK_SECRET)
      if (!valide) {
        console.warn('Signature webhook FedaPay invalide.')
        return json({ error: 'Signature invalide.' }, 401)
      }
    }

    const evenement = JSON.parse(brut)
    const nom = evenement?.name ?? evenement?.event ?? ''
    const entite = evenement?.entity ?? evenement
    const nouveauStatut = STATUTS[nom]

    if (!nouveauStatut) {
      return json({ ok: true, ignored: nom })
    }

    // Retrouve la demande d'achat : par métadonnées puis par référence
    const requestId =
      entite?.metadata?.purchase_request_id ?? (await chercherParReference(entite))

    if (!requestId) {
      console.warn('Aucune demande trouvée pour la transaction', entite?.reference ?? entite?.id)
      return json({ ok: true, ignored: 'demande_introuvable' })
    }

    const { error } = await admin
      .from('purchase_requests')
      .update({
        payment_status: nouveauStatut,
        payment_provider: 'fedapay',
        payment_reference: String(entite?.reference ?? entite?.id ?? ''),
        payment_amount: Number(entite?.amount ?? 0) || null,
        // Un paiement réussi fait passer la demande en « en cours »
        ...(nouveauStatut === 'paye' ? { status: 'en_cours' } : {})
      })
      .eq('id', requestId)

    if (error) throw error

    return json({ ok: true, requestId, payment_status: nouveauStatut })
  } catch (error) {
    console.error('fedapay-webhook :', error)
    return json({ error: error.message }, 500)
  }
})

// Recherche la demande par référence de transaction
async function chercherParReference(entite) {
  const reference = String(entite?.reference ?? entite?.id ?? '')
  if (!reference) return null

  const { data } = await admin
    .from('purchase_requests')
    .select('id')
    .eq('payment_reference', reference)
    .maybeSingle()

  return data?.id ?? null
}

// Vérifie la signature HMAC SHA-256 du corps de la requête
async function verifierSignature(corps, signature, secret) {
  if (!signature) return false

  const cle = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const attendu = await crypto.subtle.sign('HMAC', cle, new TextEncoder().encode(corps))
  const hex = [...new Uint8Array(attendu)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')

  return hex === signature.trim().toLowerCase()
}
