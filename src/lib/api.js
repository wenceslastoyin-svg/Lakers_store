// Couche d'accès aux données : toutes les requêtes Supabase sont regroupées ici.
// Les pages composent avec ces fonctions, ce qui garde les composants simples.

import { supabase } from './supabase'

// ---------------------------------------------------------------------------
// Outils internes
// ---------------------------------------------------------------------------

// Attache le nom du vendeur et son badge « Vendeur vérifié » à une liste d'annonces.
async function attachSellers(phones) {
  if (!phones || phones.length === 0) return []

  const sellerIds = [...new Set(phones.map((p) => p.seller_id).filter(Boolean))]
  if (sellerIds.length === 0) return phones

  const { data: profiles } = await supabase
    .from('public_profiles')
    .select('id, full_name, is_verified')
    .in('id', sellerIds)

  const byId = new Map((profiles ?? []).map((p) => [p.id, p]))
  return phones.map((phone) => ({
    ...phone,
    seller: byId.get(phone.seller_id) ?? null,
    images: (phone.phone_images ?? [])
      .slice()
      .sort((a, b) => a.position - b.position)
      .map((img) => img.url)
  }))
}

// ---------------------------------------------------------------------------
// Catalogue public
// ---------------------------------------------------------------------------

/**
 * Récupère des annonces validées (ou vendues) avec filtres et tri.
 * @param {object} options
 * @param {string} [options.search]  recherche sur la marque, le modèle et la description
 * @param {string} [options.brand]
 * @param {number} [options.minPrice]
 * @param {number} [options.maxPrice]
 * @param {string} [options.condition]
 * @param {string} [options.storage]
 * @param {string} [options.city]
 * @param {'recent'|'price_asc'|'price_desc'} [options.sort]
 * @param {number} [options.limit]
 * @param {boolean} [options.includeSold] inclure les téléphones vendus
 */
export async function fetchPhones(options = {}) {
  const {
    search = '',
    brand = '',
    minPrice = '',
    maxPrice = '',
    condition = '',
    storage = '',
    city = '',
    sort = 'recent',
    limit = 60,
    includeSold = false
  } = options

  let query = supabase
    .from('phones')
    .select('*, phone_images(url, position)')
    .in('status', includeSold ? ['validee', 'vendue'] : ['validee'])

  if (search.trim()) {
    const term = `%${search.trim()}%`
    query = query.or(`brand.ilike.${term},model.ilike.${term},description.ilike.${term}`)
  }
  if (brand) query = query.eq('brand', brand)
  if (condition) query = query.eq('condition', condition)
  if (storage) query = query.eq('storage', storage)
  if (city) query = query.eq('city', city)
  if (minPrice !== '' && minPrice !== null) query = query.gte('price', Number(minPrice))
  if (maxPrice !== '' && maxPrice !== null) query = query.lte('price', Number(maxPrice))

  if (sort === 'price_asc') query = query.order('price', { ascending: true })
  else if (sort === 'price_desc') query = query.order('price', { ascending: false })
  else query = query.order('created_at', { ascending: false })

  const { data, error } = await query.limit(limit)
  if (error) throw error

  return attachSellers(data)
}

// Détail d'une annonce + ses photos + son vendeur
export async function fetchPhoneById(id) {
  const { data, error } = await supabase
    .from('phones')
    .select('*, phone_images(url, position)')
    .eq('id', id)
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  const [phone] = await attachSellers([data])
  return phone
}

// ---------------------------------------------------------------------------
// Mes annonces (vendeur)
// ---------------------------------------------------------------------------

export async function fetchMyPhones(userId) {
  const { data, error } = await supabase
    .from('phones')
    .select('*, phone_images(url, position)')
    .eq('seller_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return attachSellers(data)
}

// Crée une annonce (statut « en attente » par défaut) puis enregistre ses photos
export async function createPhone(payload, imageUrls) {
  const { data, error } = await supabase
    .from('phones')
    .insert({ ...payload, status: 'en_attente' })
    .select()
    .single()

  if (error) throw error

  if (imageUrls?.length) {
    const rows = imageUrls.map((url, index) => ({
      phone_id: data.id,
      url,
      position: index
    }))
    const { error: imgError } = await supabase.from('phone_images').insert(rows)
    if (imgError) throw imgError
  }

  return data
}

// Met à jour une annonce
export async function updatePhone(id, payload) {
  const { data, error } = await supabase
    .from('phones')
    .update(payload)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

// Remplace les photos d'une annonce (utilisé lors d'une modification)
export async function replacePhoneImages(phoneId, imageUrls) {
  const { error: delError } = await supabase
    .from('phone_images')
    .delete()
    .eq('phone_id', phoneId)
  if (delError) throw delError

  if (imageUrls?.length) {
    const rows = imageUrls.map((url, index) => ({ phone_id: phoneId, url, position: index }))
    const { error: insError } = await supabase.from('phone_images').insert(rows)
    if (insError) throw insError
  }
}

// Supprime une annonce (les photos partent en cascade en base)
export async function deletePhone(id) {
  const { error } = await supabase.from('phones').delete().eq('id', id)
  if (error) throw error
}

// Marque une annonce comme vendue
export async function markPhoneAsSold(id) {
  return updatePhone(id, { status: 'vendue' })
}

// ---------------------------------------------------------------------------
// Demandes d'achat
// ---------------------------------------------------------------------------

export async function createPurchaseRequest(payload) {
  const { data, error } = await supabase
    .from('purchase_requests')
    .insert(payload)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function fetchMyPurchaseRequests(userId) {
  const { data, error } = await supabase
    .from('purchase_requests')
    .select('*, phones(brand, model, price)')
    .eq('buyer_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

// ---------------------------------------------------------------------------
// Favoris
// ---------------------------------------------------------------------------

export async function fetchFavorites(userId) {
  const { data, error } = await supabase
    .from('favorites')
    .select('created_at, phones(*, phone_images(url, position))')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return attachSellers((data ?? []).map((row) => row.phones).filter(Boolean))
}

export async function fetchFavoriteIds(userId) {
  const { data, error } = await supabase
    .from('favorites')
    .select('phone_id')
    .eq('user_id', userId)

  if (error) throw error
  return (data ?? []).map((row) => row.phone_id)
}

export async function addFavorite(userId, phoneId) {
  const { error } = await supabase
    .from('favorites')
    .insert({ user_id: userId, phone_id: phoneId })
  if (error && error.code !== '23505') throw error
}

export async function removeFavorite(userId, phoneId) {
  const { error } = await supabase
    .from('favorites')
    .delete()
    .eq('user_id', userId)
    .eq('phone_id', phoneId)
  if (error) throw error
}

// ---------------------------------------------------------------------------
// Notifications push navigateur (table push_subscriptions)
// ---------------------------------------------------------------------------

// Enregistre (ou met à jour) l'abonnement push d'un appareil
export async function savePushSubscription(userId, subscription) {
  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      user_id: userId,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys?.p256dh ?? '',
      auth: subscription.keys?.auth ?? ''
    },
    { onConflict: 'endpoint' }
  )
  if (error) throw error
}

// Supprime l'abonnement push correspondant à un endpoint
export async function deletePushSubscription(endpoint) {
  const { error } = await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint)
  if (error) throw error
}

// ---------------------------------------------------------------------------
// Espace administrateur
// ---------------------------------------------------------------------------

export async function adminFetchPhones(status) {
  let query = supabase
    .from('phones')
    .select('*, phone_images(url, position), profiles(full_name, phone, whatsapp, email)')
    .order('created_at', { ascending: false })

  if (status) query = query.eq('status', status)

  const { data, error } = await query
  if (error) throw error

  // Ajoute le tableau « images » attendu par les composants
  return (data ?? []).map((phone) => ({
    ...phone,
    images: (phone.phone_images ?? [])
      .slice()
      .sort((a, b) => a.position - b.position)
      .map((img) => img.url)
  }))
}

export async function adminSetPhoneStatus(id, status) {
  const { error } = await supabase.from('phones').update({ status }).eq('id', id)
  if (error) throw error
}

export async function adminFetchPurchaseRequests() {
  const { data, error } = await supabase
    .from('purchase_requests')
    .select(
      '*, phones(brand, model, price, id, profiles(full_name, whatsapp)), profiles(full_name, email, phone, whatsapp)'
    )
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function adminSetRequestStatus(id, status) {
  const { error } = await supabase.from('purchase_requests').update({ status }).eq('id', id)
  if (error) throw error
}

export async function adminFetchUsers() {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function adminSetUserFlags(id, flags) {
  const { error } = await supabase.from('profiles').update(flags).eq('id', id)
  if (error) throw error
}

// ---------------------------------------------------------------------------
// Statistiques de l'espace administrateur
// ---------------------------------------------------------------------------

// Compte les lignes d'une table (avec un filtre optionnel)
async function countRows(table, build) {
  let query = supabase.from(table).select('id', { count: 'exact', head: true })
  if (build) query = build(query)
  const { count, error } = await query
  if (error) throw error
  return count ?? 0
}

/**
 * Chiffres clés affichés dans l'onglet « Statistiques » :
 * annonces par statut, demandes, utilisateurs, paiements du mois, derniers inscrits.
 */
export async function adminFetchStats() {
  const debutDuMois = new Date()
  debutDuMois.setDate(1)
  debutDuMois.setHours(0, 0, 0, 0)
  const isoMois = debutDuMois.toISOString()

  const [enAttente, validees, refusees, vendues] = await Promise.all([
    countRows('phones', (q) => q.eq('status', 'en_attente')),
    countRows('phones', (q) => q.eq('status', 'validee')),
    countRows('phones', (q) => q.eq('status', 'refusee')),
    countRows('phones', (q) => q.eq('status', 'vendue'))
  ])

  const [demandesTotal, demandesNouvelles] = await Promise.all([
    countRows('purchase_requests'),
    countRows('purchase_requests', (q) => q.eq('status', 'nouvelle'))
  ])

  const [utilisateursTotal, utilisateursCeMois] = await Promise.all([
    countRows('profiles'),
    countRows('profiles', (q) => q.gte('created_at', isoMois))
  ])

  // Paiements encaissés ce mois-ci (demandes payées créées ce mois)
  const { data: paiements, error: paiementsError } = await supabase
    .from('purchase_requests')
    .select('payment_amount')
    .eq('payment_status', 'paye')
    .gte('created_at', isoMois)
  if (paiementsError) throw paiementsError

  const montantMois = (paiements ?? []).reduce(
    (total, row) => total + Number(row.payment_amount ?? 0),
    0
  )

  // Cinq derniers utilisateurs inscrits
  const { data: derniersUtilisateurs, error: recentsError } = await supabase
    .from('profiles')
    .select('id, full_name, email, created_at')
    .order('created_at', { ascending: false })
    .limit(5)
  if (recentsError) throw recentsError

  return {
    annonces: { en_attente: enAttente, validee: validees, refusee: refusees, vendue: vendues },
    totalAnnonces: enAttente + validees + refusees + vendues,
    demandes: { total: demandesTotal, nouvelles: demandesNouvelles },
    utilisateurs: { total: utilisateursTotal, ceMois: utilisateursCeMois },
    paiements: { montantMois, nombreMois: (paiements ?? []).length },
    derniersUtilisateurs: derniersUtilisateurs ?? []
  }
}

// ---------------------------------------------------------------------------
// Paiement FedaPay (via Edge Function)
// ---------------------------------------------------------------------------

/**
 * Demande la création d'une transaction FedaPay pour une demande d'achat.
 * Renvoie { url } : l'URL de la page de paiement mobile money.
 */
export async function createFedapayCheckout(requestId) {
  const { data, error } = await supabase.functions.invoke('fedapay-create', {
    body: { requestId }
  })

  if (error) throw new Error(error.message || 'Impossible de démarrer le paiement.')
  if (data?.error) throw new Error(data.error)

  return data
}

// Relit l'état d'un paiement après le retour de FedaPay
export async function fetchPurchaseRequestById(id) {
  const { data, error } = await supabase
    .from('purchase_requests')
    .select('*, phones(brand, model, price, id)')
    .eq('id', id)
    .maybeSingle()

  if (error) throw error
  return data
}

// Vérifie le paiement auprès de FedaPay (utilisé au retour sur la page de résultat)
export async function verifyFedapayPayment(requestId) {
  const { data, error } = await supabase.functions.invoke('fedapay-verify', {
    body: { requestId }
  })
  if (error) return null
  return data
}
