// Edge Function : fedapay-verify
// Appelée par le site au retour du client depuis FedaPay.
// Elle interroge FedaPay pour connaître le statut réel de la transaction et
// met à jour la demande d'achat correspondante.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, json } from '../_shared/cors.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const FEDAPAY_SECRET_KEY = Deno.env.get('FEDAPAY_SECRET_KEY') ?? ''
const FEDAPAY_ENV = Deno.env.get('FEDAPAY_ENV') ?? 'sandbox'

const API_BASE =
  FEDAPAY_ENV === 'live' ? 'https://api.fedapay.com/v1' : 'https://sandbox-api.fedapay.com/v1'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { requestId } = await req.json()
    if (!requestId) return json({ error: 'Demande d’achat manquante.' }, 400)

    // Identification de l'utilisateur
    const asUser = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } }
    })
    const {
      data: { user }
    } = await asUser.auth.getUser()
    if (!user) return json({ error: 'Non authentifié.' }, 401)

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
    const { data: demande } = await admin
      .from('purchase_requests')
      .select('id, buyer_id, payment_status, payment_reference')
      .eq('id', requestId)
      .maybeSingle()

    if (!demande) return json({ error: 'Demande introuvable.' }, 404)
    if (demande.buyer_id !== user.id) return json({ error: 'Accès refusé.' }, 403)
    if (!demande.payment_reference || !FEDAPAY_SECRET_KEY) {
      return json({ payment_status: demande.payment_status })
    }

    // Interrogation de FedaPay
    const response = await fetch(`${API_BASE}/transactions/${demande.payment_reference}`, {
      headers: {
        Authorization: `Bearer ${FEDAPAY_SECRET_KEY}`,
        Accept: 'application/json'
      }
    })
    const data = await response.json().catch(() => ({}))
    const transaction = data['v1/transaction'] ?? data
    const statutFeda = String(transaction?.status ?? '')

    // Correspondance FedaPay -> nos statuts
    let nouveau = demande.payment_status
    if (statutFeda === 'approved' || statutFeda === 'transferred') nouveau = 'paye'
    else if (statutFeda === 'declined' || statutFeda === 'canceled') nouveau = 'echoue'

    if (nouveau !== demande.payment_status) {
      await admin
        .from('purchase_requests')
        .update({
          payment_status: nouveau,
          ...(nouveau === 'paye' ? { status: 'en_cours' } : {})
        })
        .eq('id', requestId)
    }

    return json({
      payment_status: nouveau,
      fedapay_status: statutFeda,
      reference: demande.payment_reference
    })
  } catch (error) {
    console.error('fedapay-verify :', error)
    return json({ error: error.message }, 500)
  }
})
