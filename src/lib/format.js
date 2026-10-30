// Fonctions d'affichage et de formatage (prix, dates, liens WhatsApp)

import { ADMIN_WHATSAPP, CURRENCY, APP_URL } from './constants'

// Formate un prix en FCFA : 125000 -> "125 000 FCFA"
export function formatPrice(price) {
  if (price === null || price === undefined || price === '') return '—'
  const n = Number(price)
  if (Number.isNaN(n)) return '—'
  return `${n.toLocaleString('fr-FR').replace(/\u202f|\u00a0/g, ' ')} ${CURRENCY}`
}

// Formate une date ISO en date lisible : "12 mars 2026"
export function formatDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
}

// Durée écoulée depuis une date : "il y a 3 jours"
export function timeAgo(iso) {
  if (!iso) return ''
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  const steps = [
    { limit: 60, div: 1, unit: 'seconde' },
    { limit: 3600, div: 60, unit: 'minute' },
    { limit: 86400, div: 3600, unit: 'heure' },
    { limit: 2592000, div: 86400, unit: 'jour' },
    { limit: 31536000, div: 2592000, unit: 'mois' },
    { limit: Infinity, div: 31536000, unit: 'an' }
  ]
  for (const step of steps) {
    if (seconds < step.limit) {
      const value = Math.floor(seconds / step.div)
      return `il y a ${value} ${step.unit}${value > 1 ? 's' : ''}`
    }
  }
  return ''
}

// Nettoie un numéro de téléphone pour un lien WhatsApp (chiffres uniquement)
export function cleanPhone(phone) {
  return String(phone || '').replace(/[^\d]/g, '')
}

// Construit un lien wa.me avec message pré-rempli
export function whatsappLink(phone, message = '') {
  const number = cleanPhone(phone)
  const text = message ? `?text=${encodeURIComponent(message)}` : ''
  return `https://wa.me/${number}${text}`
}

// Message pré-rempli pour contacter l'administrateur au sujet d'un téléphone
export function adminPhoneMessage(phone) {
  const title = phone ? `${phone.brand} ${phone.model}` : 'un téléphone'
  const price = phone ? formatPrice(phone.price) : ''
  return `Bonjour ${'LAKERS STORE'}, je suis intéressé(e) par votre annonce : ${title}${
    price ? ` (${price})` : ''
  }.`
}

// Message pré-rempli pour partager une annonce
export function sharePhoneMessage(phone) {
  const title = `${phone.brand} ${phone.model}`
  return `${title} à ${formatPrice(phone.price)} sur LAKERS STORE : ${APP_URL}/telephone/${phone.id}`
}

// Lien WhatsApp vers l'administrateur
export function adminWhatsappLink(message = '') {
  return whatsappLink(ADMIN_WHATSAPP, message)
}

// Génère un "slug" simple à partir d'un texte (utilisé pour les noms de fichiers)
export function slugify(text) {
  return String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
}
