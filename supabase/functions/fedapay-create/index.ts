// Edge Function : fedapay-create
// Crée une transaction FedaPay pour une demande d'achat et renvoie l'URL de la
// page de paiement mobile money (MTN MoMo, Moov Money, Celtiis Cash).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, json } from '../_shared/cors.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const APP_URL = Deno.env.get('APP_URL') ?? ''

const FEDAPAY_SECRET_KEY = Deno.env.get('FEDAPAY_SECRET_KEY') ?? ''
const FEDAPAY_ENV = Deno.env.get('FEDAPAY_ENV') ?? 'sandbox'

// En mode test on utilise l'API sandbox ; en production l'API live
const API_BASE =
  FEDAPAY_ENV === 'live' ? 'https://api.fedapay.com/v1' : 'https://sandbox-api.fedapay.com/v1'
const CHECKOUT_BASE =
  FEDAPAY_ENV === 'live' ? 'https://process.fedapay.com' : 'https://sandbox-process.fedapay.com'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    if (!FEDAPAY_SECRET_KEY) {
      return json({ error: 'FedaPay n’est pas configuré (clé secrète manquante).' }, 500)
    }

    // 1) Identification de l'utilisateur à partir de son jeton Supabase
    const authHeader = req.headers.get('Authorization') ?? ''
    const asUser = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } }
    })
    const {
      data: { user }
    } = await asUser.auth.getUser()

    if (!user) return json({ error: 'Vous devez être connecté pour payer.' }, 401)

    // 2) Lecture de la demande d'achat (client service role)
    const { requestId } = await req.json()
    if (!requestId) return json({ error: 'Demande d’achat manquante.' }, 400)

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

    const { data: demande, error: demandeError } = await admin
      .from('purchase_requests')
      .select('*, phones(id, brand, model, price)')
      .eq('id', requestId)
      .maybeSingle()

    if (demandeError || !demande) return json({ error: 'Demande d’achat introuvable.' }, 404)
    if (demande.buyer_id !== user.id) {
      return json({ error: 'Cette demande ne vous appartient pas.' }, 403)
    }
    if (demande.payment_status === 'paye') {
      return json({ error: 'Cette demande a déjà été payée.' }, 400)
    }

    const { data: profil } = await admin
      .from('profiles')
      .select('full_name, email, whatsapp, phone')
      .eq('id', user.id)
      .maybeSingle()

    const montant = Number(demande.phones?.price ?? demande.payment_amount ?? 0)
    if (!montant || montant <= 0) return json({ error: 'Montant invalide.' }, 400)

    // 3) Création de la transaction FedaPay
    const { country, number } = decouperTelephone(profil?.whatsapp || profil?.phone)
    const origine = APP_URL || new URL(req.url).origin
    const callbackUrl = `${origine}/paiement/${requestId}`
    const titre = demande.phones
      ? `${demande.phones.brand} ${demande.phones.model}`
      : 'Téléphone LAKERS STORE'

    const transaction = await fedapay('/transactions', 'POST', {
      description: `LAKERS STORE - ${titre}`,
      amount: montant,
      currency: { iso: 'XOF' },
      callback_url: callbackUrl,
      customer: {
        firstname: demande.buyer_name || profil?.full_name || 'Client',
        lastname: '',
        email: profil?.email || 'client@lakersstore.bj',
        phone_number: { number, country }
      },
      metadata: { purchase_request_id: requestId, buyer_id: user.id }
    })

    const transactionId = transaction?.id
    if (!transactionId) throw new Error('FedaPay n’a pas renvoyé d’identifiant de transaction.')

    // 4) Génération du jeton de paiement -> URL de la page de paiement
    const token = await fedapay(`/transactions/${transactionId}/token`, 'POST', {})
    const url = token?.url || `${CHECKOUT_BASE}/${token?.token}`

    if (!url) throw new Error('Impossible d’obtenir l’URL de paiement FedaPay.')

    // 5) Mémorisation de la référence de transaction sur la demande
    await admin
      .from('purchase_requests')
      .update({
        payment_provider: 'fedapay',
        payment_status: 'en_attente',
        payment_reference: String(transaction.reference ?? transactionId),
        payment_amount: montant
      })
      .eq('id', requestId)

    return json({ url, reference: transaction.reference ?? String(transactionId) })
  } catch (error) {
    console.error('fedapay-create :', error)
    return json({ error: error.message ?? 'Erreur de paiement.' }, 500)
  }
})

// ---------------------------------------------------------------------------
// Appel générique à l'API FedaPay
// ---------------------------------------------------------------------------
async function fedapay(path, method, body) {
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${FEDAPAY_SECRET_KEY}`,
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
    body: JSON.stringify(body)
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    console.error('Réponse FedaPay :', data)
    const message =
      data?.message || data?.errors?.[0]?.message || 'FedaPay a refusé la transaction.'
    throw new Error(message)
  }

  // FedaPay encapsule parfois la réponse : { "v1/transaction": {...} }
  return data['v1/transaction'] ?? data['v1/token'] ?? data
}

// Découpe un numéro (ex. +22950813586) en { country: 'bj', number: '50813586' }
function decouperTelephone(telephone) {
  const chiffres = String(telephone || '').replace(/[^\d]/g, '')
  if (chiffres.startsWith('229')) {
    return { country: 'bj', number: chiffres.slice(3) }
  }
  return { country: 'bj', number: chiffres || '00000000' }
}
