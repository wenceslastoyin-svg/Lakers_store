// Constantes métier : listes de choix, configuration du site, textes réutilisables

// --- Configuration générale du site -----------------------------------------
export const SITE_NAME = import.meta.env.VITE_SITE_NAME || 'LAKERS STORE'
export const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || 'wenceslastoyin@gmail.com'
export const ADMIN_WHATSAPP = import.meta.env.VITE_ADMIN_WHATSAPP || '+22950813586'
export const APP_URL = import.meta.env.VITE_APP_URL || window.location.origin
export const CURRENCY = 'FCFA'

// --- Marques proposées -------------------------------------------------------
export const BRANDS = [
  'Apple',
  'Samsung',
  'Tecno',
  'Infinix',
  'Itel',
  'Xiaomi',
  'Redmi',
  'Oppo',
  'Vivo',
  'Huawei',
  'Nokia',
  'Realme',
  'OnePlus',
  'Google',
  'Autre'
]

// --- États du téléphone ------------------------------------------------------
export const CONDITIONS = [
  { value: 'neuf', label: 'Neuf' },
  { value: 'comme_neuf', label: 'Comme neuf' },
  { value: 'bon_etat', label: 'Bon état' },
  { value: 'a_reparer', label: 'À réparer' }
]

// Libellé lisible d'un état à partir de sa valeur technique
export const conditionLabel = (value) =>
  CONDITIONS.find((c) => c.value === value)?.label ?? value

// --- Stockage ----------------------------------------------------------------
export const STORAGE_OPTIONS = [
  '16 Go',
  '32 Go',
  '64 Go',
  '128 Go',
  '256 Go',
  '512 Go',
  '1 To',
  'Autre'
]

// --- Mémoire vive ------------------------------------------------------------
export const RAM_OPTIONS = ['2 Go', '3 Go', '4 Go', '6 Go', '8 Go', '12 Go', '16 Go', 'Autre']

// --- Villes du Bénin ---------------------------------------------------------
export const CITIES = [
  'Cotonou',
  'Porto-Novo',
  'Abomey-Calavi',
  'Parakou',
  'Bohicon',
  'Abomey',
  'Natitingou',
  'Djougou',
  'Lokossa',
  'Ouidah',
  'Kandi',
  'Malanville',
  'Savalou',
  'Pobè',
  'Comè',
  'Autre'
]

// --- Statuts d'une annonce ---------------------------------------------------
export const PHONE_STATUS = {
  en_attente: { label: 'En attente de validation', className: 'bg-sun-400/20 text-sun-600' },
  validee: { label: 'Validée', className: 'bg-brand-100 text-brand-700' },
  refusee: { label: 'Refusée', className: 'bg-alert-500/15 text-alert-600' },
  vendue: { label: 'Vendu', className: 'bg-slate-200 text-slate-600' }
}

// --- Statuts d'une demande d'achat ------------------------------------------
export const REQUEST_STATUS = {
  nouvelle: { label: 'Nouvelle', className: 'bg-sun-400/20 text-sun-600' },
  en_cours: { label: 'En cours', className: 'bg-brand-100 text-brand-700' },
  conclue: { label: 'Conclue', className: 'bg-brand-600 text-white' },
  annulee: { label: 'Annulée', className: 'bg-alert-500/15 text-alert-600' }
}

// --- Statuts d'un paiement ---------------------------------------------------
export const PAYMENT_STATUS = {
  en_attente: { label: 'Paiement en attente', className: 'bg-sun-400/20 text-sun-600' },
  paye: { label: 'Payé', className: 'bg-brand-100 text-brand-700' },
  echoue: { label: 'Échoué', className: 'bg-alert-500/15 text-alert-600' }
}

// --- Textes de sécurité ------------------------------------------------------
export const SCAM_WARNING =
  'Ne payez jamais avant d’avoir vu le téléphone.'

// --- Nombre de photos autorisées par annonce --------------------------------
export const MIN_PHOTOS = 3
export const MAX_PHOTOS = 6
