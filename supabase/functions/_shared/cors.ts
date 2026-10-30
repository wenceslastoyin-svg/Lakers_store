// En-têtes CORS partagés par toutes les Edge Functions
// (nécessaires pour que le site puisse appeler les fonctions depuis le navigateur)

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-webhook-secret, x-fedapay-signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

// Réponse JSON avec les en-têtes CORS
export function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}
