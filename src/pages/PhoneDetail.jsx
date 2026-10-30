// Page détail d'un téléphone : galerie photos, caractéristiques, achat, WhatsApp, partage

import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import BuyRequestModal from '../components/BuyRequestModal'
import FavoriteButton from '../components/FavoriteButton'
import ScamWarning from '../components/ScamWarning'
import ShareButton from '../components/ShareButton'
import { Alert, EmptyState, PageLoader, StatusBadge, VerifiedBadge } from '../components/ui'
import {
  IconAlert,
  IconArrowLeft,
  IconCamera,
  IconChevronRight,
  IconMapPin,
  IconPhone,
  IconWhatsApp
} from '../components/icons'
import { fetchPhoneById } from '../lib/api'
import { PHONE_STATUS, conditionLabel } from '../lib/constants'
import { adminPhoneMessage, adminWhatsappLink, formatPrice, timeAgo, whatsappLink } from '../lib/format'
import { useAuth } from '../context/AuthContext'

export default function PhoneDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()

  const [phone, setPhone] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeImage, setActiveImage] = useState(0)
  const [buyOpen, setBuyOpen] = useState(false)

  // Chargement de l'annonce
  useEffect(() => {
    let active = true
    setLoading(true)
    fetchPhoneById(id)
      .then((data) => {
        if (!active) return
        setPhone(data)
        setActiveImage(0)
      })
      .catch((err) => active && setError(err.message))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [id])

  if (loading) return <PageLoader label="Chargement de l’annonce…" />

  if (error) {
    return (
      <div className="container-app py-10">
        <Alert type="error">Impossible de charger cette annonce : {error}</Alert>
      </div>
    )
  }

  // Annonce inexistante ou non accessible (non validée par l'administrateur)
  if (!phone) {
    return (
      <div className="container-app py-10">
        <EmptyState
          icon={IconAlert}
          title="Annonce introuvable"
          description="Cette annonce n’existe pas ou n’a pas encore été validée par l’administrateur."
          action={
            <Link to="/catalogue" className="btn-primary">
              Voir le catalogue
            </Link>
          }
        />
      </div>
    )
  }

  const images = phone.images ?? []
  const isSold = phone.status === 'vendue'
  const cover = images[activeImage]

  // Ouvre la fenêtre d'achat : connexion obligatoire
  const handleBuy = () => {
    if (!isAuthenticated) {
      navigate('/connexion', { state: { from: `/telephone/${phone.id}` } })
      return
    }
    setBuyOpen(true)
  }

  return (
    <div className="container-app py-5">
      {/* Fil d'Ariane simplifié */}
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-slate-500 hover:text-brand-700"
      >
        <IconArrowLeft className="h-4 w-4" />
        Retour
      </button>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ------------------------------ Galerie ------------------------------ */}
        <section>
          <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white">
            {cover ? (
              <img
                src={cover}
                alt={`${phone.brand} ${phone.model}`}
                className="aspect-square w-full object-cover"
              />
            ) : (
              <div className="grid aspect-square w-full place-items-center text-slate-300">
                <IconCamera className="h-12 w-12" />
              </div>
            )}

            <div className="absolute right-3 top-3">
              <FavoriteButton phoneId={phone.id} />
            </div>

            {isSold && (
              <span className="absolute left-3 top-3 rounded-full bg-slate-900/85 px-3 py-1 text-xs font-bold text-white">
                Déjà vendu
              </span>
            )}

            {/* Navigation entre les photos */}
            {images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => setActiveImage((i) => (i - 1 + images.length) % images.length)}
                  className="absolute left-2 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-slate-700 shadow-card"
                  aria-label="Photo précédente"
                >
                  <IconArrowLeft />
                </button>
                <button
                  type="button"
                  onClick={() => setActiveImage((i) => (i + 1) % images.length)}
                  className="absolute right-2 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-slate-700 shadow-card"
                  aria-label="Photo suivante"
                >
                  <IconChevronRight />
                </button>
              </>
            )}
          </div>

          {/* Vignettes */}
          {images.length > 1 && (
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {images.map((url, index) => (
                <button
                  key={url}
                  type="button"
                  onClick={() => setActiveImage(index)}
                  className={`h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 ${
                    index === activeImage ? 'border-brand-600' : 'border-transparent'
                  }`}
                  aria-label={`Photo ${index + 1}`}
                >
                  <img src={url} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </section>

        {/* --------------------------- Informations ---------------------------- */}
        <section className="space-y-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge config={PHONE_STATUS[phone.status]} />
              {phone.seller?.is_verified && <VerifiedBadge />}
            </div>

            <h1 className="mt-2 text-2xl font-extrabold text-slate-900">
              {phone.brand} {phone.model}
            </h1>

            <p className="mt-1 text-3xl font-black text-brand-700">{formatPrice(phone.price)}</p>

            <p className="mt-1 text-sm text-slate-500">
              Publié {timeAgo(phone.created_at)} · {phone.city}
            </p>
          </div>

          {/* Caractéristiques */}
          <dl className="card divide-y divide-slate-100">
            <Row label="État" value={conditionLabel(phone.condition)} />
            <Row label="Stockage" value={phone.storage || '—'} />
            <Row label="RAM" value={phone.ram || '—'} />
            <Row label="Couleur" value={phone.color || '—'} />
            <Row label="Accessoires inclus" value={phone.accessories || 'Aucun'} />
            <Row label="Problèmes éventuels" value={phone.issues || 'Aucun'} />
            <Row
              label="Ville"
              value={
                <span className="inline-flex items-center gap-1">
                  <IconMapPin className="h-4 w-4 text-slate-400" />
                  {phone.city}
                </span>
              }
            />
          </dl>

          {/* Description */}
          {phone.description && (
            <div className="card p-4">
              <h2 className="mb-2 text-sm font-bold text-slate-800">Description</h2>
              <p className="whitespace-pre-line text-sm leading-relaxed text-slate-600">
                {phone.description}
              </p>
            </div>
          )}

          <ScamWarning />

          {/* Actions principales */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={handleBuy}
              disabled={isSold}
              className="btn-primary w-full text-base"
            >
              <IconPhone />
              {isSold ? 'Ce téléphone est déjà vendu' : 'Je veux l’acheter'}
            </button>

            <div className="grid gap-2 sm:grid-cols-2">
              <a
                href={adminWhatsappLink(adminPhoneMessage(phone))}
                target="_blank"
                rel="noopener noreferrer"
                className="btn w-full bg-[#25D366] text-white hover:brightness-95"
              >
                <IconWhatsApp />
                Contacter sur WhatsApp
              </a>
              <ShareButton phone={phone} className="w-full" />
            </div>
          </div>

          {/* Vendeur */}
          {phone.seller && (
            <div className="card flex items-center gap-3 p-4">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-brand-600 font-bold text-white">
                {(phone.seller.full_name || 'V').charAt(0).toUpperCase()}
              </span>
              <div className="flex-1">
                <p className="text-sm font-bold text-slate-900">
                  {phone.seller.full_name || 'Vendeur'}
                </p>
                <p className="text-xs text-slate-500">
                  Membre depuis {new Date(phone.seller.created_at).getFullYear() || ''}
                  {phone.seller.is_verified && ' · Identité vérifiée'}
                </p>
              </div>
              {phone.seller.is_verified && <VerifiedBadge showLabel={false} />}
            </div>
          )}

          {/* Acheteurs : suivi de leurs demandes */}
          <BuyerNote />
        </section>
      </div>

      {/* Fenêtre « Je veux l'acheter » */}
      {buyOpen && <BuyRequestModal phone={phone} onClose={() => setBuyOpen(false)} />}
    </div>
  )
}

// Ligne de caractéristique
function Row({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-4 px-4 py-3">
      <dt className="text-sm text-slate-500">{label}</dt>
      <dd className="text-right text-sm font-semibold text-slate-800">{value}</dd>
    </div>
  )
}

// Petit rappel affiché seulement pour les acheteurs connectés
function BuyerNote() {
  const { isAuthenticated, user } = useAuth()
  if (!isAuthenticated) {
    return (
      <p className="text-xs text-slate-400">
        Connectez-vous pour demander ce téléphone et suivre vos demandes.
      </p>
    )
  }
  return (
    <p className="text-xs text-slate-400">
      Vos demandes d’achat :{' '}
      <Link to="/favoris" className="font-semibold text-brand-700 hover:underline">
        mes favoris
      </Link>{' '}
      · connecté en tant que {user?.email}
    </p>
  )
}
