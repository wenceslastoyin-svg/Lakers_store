// Espace administrateur : validation des annonces, suivi des demandes d'achat
// et gestion des utilisateurs. Interface mobile-first à onglets.

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  adminFetchPhones,
  adminSetPhoneStatus,
  deletePhone,
  adminFetchPurchaseRequests,
  adminSetRequestStatus,
  adminFetchUsers,
  adminSetUserFlags,
  adminFetchStats
} from '../lib/api'
import { PHONE_STATUS, REQUEST_STATUS, PAYMENT_STATUS, conditionLabel } from '../lib/constants'
import { formatPrice, formatDate, whatsappLink } from '../lib/format'
import {
  StatusBadge,
  Alert,
  PageLoader,
  EmptyState,
  Field,
  VerifiedBadge
} from '../components/ui'
import { IconCart, IconMail, IconPhone, IconTrash, IconUser, IconWhatsApp } from '../components/icons'

// Onglets disponibles
const TABS = [
  { key: 'statistiques', label: 'Statistiques' },
  { key: 'annonces', label: 'Annonces' },
  { key: 'demandes', label: 'Demandes d’achat' },
  { key: 'utilisateurs', label: 'Utilisateurs' }
]

// Filtres de statut des annonces ('' = toutes)
const PHONE_FILTERS = [
  { value: 'en_attente', label: 'En attente' },
  { value: 'validee', label: 'Validées' },
  { value: 'refusee', label: 'Refusées' },
  { value: 'vendue', label: 'Vendues' },
  { value: '', label: 'Toutes' }
]

// Libellés lisibles de l'intention d'achat
const INTENT_CONFIG = {
  payer_maintenant: { label: 'Veut payer maintenant', className: 'bg-sun-400/20 text-sun-600' },
  discuter: { label: 'Veut d’abord discuter', className: 'bg-slate-100 text-slate-600' }
}

// ---------------------------------------------------------------------------
// Page principale
// ---------------------------------------------------------------------------

export default function Admin() {
  const { profile } = useAuth()

  // Onglet actif
  const [tab, setTab] = useState('statistiques')

  // Message global (succès temporaire ou erreur d'action)
  const [notice, setNotice] = useState(null)
  const notify = useCallback((type, message) => setNotice({ type, message }), [])

  // Fait disparaître le message après quelques secondes
  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(() => setNotice(null), 4000)
    return () => clearTimeout(timer)
  }, [notice])

  // --- Annonces -------------------------------------------------------------
  const [phoneStatus, setPhoneStatus] = useState('en_attente')
  const [phones, setPhones] = useState([])
  const [phonesLoading, setPhonesLoading] = useState(false)
  const [phonesError, setPhonesError] = useState(null)

  // --- Demandes d'achat -----------------------------------------------------
  const [requests, setRequests] = useState([])
  const [requestsLoading, setRequestsLoading] = useState(false)
  const [requestsError, setRequestsError] = useState(null)

  // --- Statistiques ---------------------------------------------------------
  const [stats, setStats] = useState(null)
  const [statsLoading, setStatsLoading] = useState(false)
  const [statsError, setStatsError] = useState(null)

  // --- Utilisateurs ---------------------------------------------------------
  const [users, setUsers] = useState([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [usersError, setUsersError] = useState(null)
  const [userSearch, setUserSearch] = useState('')

  // --- Chargements ----------------------------------------------------------
  const loadPhones = useCallback(async (status) => {
    setPhonesLoading(true)
    setPhonesError(null)
    try {
      const data = await adminFetchPhones(status || undefined)
      setPhones(data ?? [])
    } catch (err) {
      setPhonesError(err.message || 'Impossible de charger les annonces.')
    } finally {
      setPhonesLoading(false)
    }
  }, [])

  const loadRequests = useCallback(async () => {
    setRequestsLoading(true)
    setRequestsError(null)
    try {
      const data = await adminFetchPurchaseRequests()
      setRequests(data ?? [])
    } catch (err) {
      setRequestsError(err.message || 'Impossible de charger les demandes.')
    } finally {
      setRequestsLoading(false)
    }
  }, [])

  const loadUsers = useCallback(async () => {
    setUsersLoading(true)
    setUsersError(null)
    try {
      const data = await adminFetchUsers()
      setUsers(data ?? [])
    } catch (err) {
      setUsersError(err.message || 'Impossible de charger les utilisateurs.')
    } finally {
      setUsersLoading(false)
    }
  }, [])

  const loadStats = useCallback(async () => {
    setStatsLoading(true)
    setStatsError(null)
    try {
      const data = await adminFetchStats()
      setStats(data)
    } catch (err) {
      setStatsError(err.message || 'Impossible de charger les statistiques.')
    } finally {
      setStatsLoading(false)
    }
  }, [])

  // Charge uniquement les données de l'onglet actif
  useEffect(() => {
    if (tab === 'statistiques') loadStats()
    else if (tab === 'annonces') loadPhones(phoneStatus)
    else if (tab === 'demandes') loadRequests()
    else if (tab === 'utilisateurs') loadUsers()
  }, [tab, phoneStatus, loadStats, loadPhones, loadRequests, loadUsers])

  // --- Actions --------------------------------------------------------------
  const handlePhoneStatus = async (id, status) => {
    try {
      await adminSetPhoneStatus(id, status)
      await loadPhones(phoneStatus)
      notify('success', 'Statut de l’annonce mis à jour.')
    } catch (err) {
      notify('error', err.message || 'Action impossible.')
    }
  }

  const handleDeletePhone = async (phone) => {
    const ok = window.confirm(
      `Supprimer définitivement l’annonce « ${phone.brand} ${phone.model} » ?`
    )
    if (!ok) return
    try {
      await deletePhone(phone.id)
      await loadPhones(phoneStatus)
      notify('success', 'Annonce supprimée.')
    } catch (err) {
      notify('error', err.message || 'Suppression impossible.')
    }
  }

  const handleRequestStatus = async (id, status) => {
    try {
      await adminSetRequestStatus(id, status)
      await loadRequests()
      notify('success', 'Statut de la demande mis à jour.')
    } catch (err) {
      notify('error', err.message || 'Action impossible.')
    }
  }

  const handleUserFlags = async (id, flags, message) => {
    try {
      await adminSetUserFlags(id, flags)
      await loadUsers()
      notify('success', message)
    } catch (err) {
      notify('error', err.message || 'Action impossible.')
    }
  }

  // Filtre local de la liste des utilisateurs (nom, e-mail, téléphone)
  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase()
    if (!q) return users
    return users.filter(
      (u) =>
        (u.full_name || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q) ||
        (u.phone || '').toLowerCase().includes(q)
    )
  }, [users, userSearch])

  return (
    <div className="container-app py-6">
      {/* En-tête */}
      <header className="mb-4">
        <h1 className="text-2xl font-extrabold text-slate-900">Espace administrateur</h1>
        <p className="text-sm text-slate-500">
          Connecté·e en tant que{' '}
          <span className="font-semibold text-slate-700">
            {profile?.full_name || 'administrateur'}
          </span>
        </p>
      </header>

      {/* Message global */}
      {notice && (
        <Alert type={notice.type} className="mb-4">
          {notice.message}
        </Alert>
      )}

      {/* Barre d'onglets scrollable sur mobile */}
      <div className="mb-5 overflow-x-auto">
        <div className="flex min-w-max gap-1 border-b border-slate-200">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
                tab === t.key
                  ? 'border-brand-600 text-brand-700'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ----------------------------- Statistiques ---------------------------- */}
      {tab === 'statistiques' && (
        <section className="space-y-4">
          {statsError && <Alert type="error">{statsError}</Alert>}

          {statsLoading ? (
            <PageLoader label="Chargement des statistiques…" />
          ) : stats ? (
            <StatsPanel stats={stats} />
          ) : null}
        </section>
      )}

      {/* ------------------------------- Annonces ------------------------------ */}
      {tab === 'annonces' && (
        <section className="space-y-4">
          <Field label="Filtrer par statut" htmlFor="phone-status-filter">
            <select
              id="phone-status-filter"
              className="field"
              value={phoneStatus}
              onChange={(e) => setPhoneStatus(e.target.value)}
            >
              {PHONE_FILTERS.map((f) => (
                <option key={f.value || 'toutes'} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </Field>

          {phonesError && <Alert type="error">{phonesError}</Alert>}

          {phonesLoading ? (
            <PageLoader label="Chargement des annonces…" />
          ) : phones.length === 0 ? (
            <EmptyState
              icon={IconCart}
              title="Aucune annonce à afficher"
              description={
                phoneStatus === 'en_attente'
                  ? 'Aucune annonce en attente de validation.'
                  : 'Aucune annonce ne correspond à ce filtre.'
              }
            />
          ) : (
            phones.map((phone) => (
              <PhoneRow
                key={phone.id}
                phone={phone}
                onStatus={handlePhoneStatus}
                onDelete={handleDeletePhone}
              />
            ))
          )}
        </section>
      )}

      {/* --------------------------- Demandes d'achat -------------------------- */}
      {tab === 'demandes' && (
        <section className="space-y-4">
          {requestsError && <Alert type="error">{requestsError}</Alert>}

          {requestsLoading ? (
            <PageLoader label="Chargement des demandes…" />
          ) : requests.length === 0 ? (
            <EmptyState
              icon={IconMail}
              title="Aucune demande d’achat"
              description="Aucune demande d’achat pour le moment."
            />
          ) : (
            requests.map((request) => (
              <RequestRow key={request.id} request={request} onStatus={handleRequestStatus} />
            ))
          )}
        </section>
      )}

      {/* ----------------------------- Utilisateurs ---------------------------- */}
      {tab === 'utilisateurs' && (
        <section className="space-y-4">
          <Field label="Rechercher un utilisateur" htmlFor="user-search">
            <input
              id="user-search"
              type="search"
              className="field"
              placeholder="Nom, e-mail ou téléphone"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
            />
          </Field>

          {usersError && <Alert type="error">{usersError}</Alert>}

          {usersLoading ? (
            <PageLoader label="Chargement des utilisateurs…" />
          ) : filteredUsers.length === 0 ? (
            <EmptyState
              icon={IconUser}
              title="Aucun utilisateur"
              description={
                userSearch
                  ? 'Aucun utilisateur ne correspond à votre recherche.'
                  : 'Aucun utilisateur enregistré.'
              }
            />
          ) : (
            filteredUsers.map((user) => (
              <UserRow key={user.id} user={user} onFlags={handleUserFlags} />
            ))
          )}
        </section>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Onglet « Statistiques » : chiffres clés, répartition des annonces, inscrits
// ---------------------------------------------------------------------------

function StatsPanel({ stats }) {
  // Cartes de chiffres clés
  const cards = [
    { label: 'Annonces au total', value: stats.totalAnnonces },
    { label: 'Annonces en attente', value: stats.annonces.en_attente, accent: 'sun' },
    { label: 'Demandes d’achat', value: stats.demandes.total },
    { label: 'Nouvelles demandes', value: stats.demandes.nouvelles, accent: 'sun' },
    { label: 'Utilisateurs', value: stats.utilisateurs.total },
    { label: 'Inscriptions ce mois', value: stats.utilisateurs.ceMois }
  ]

  // Répartition des annonces par statut (avec les libellés déjà définis)
  const repartition = [
    { key: 'en_attente', config: PHONE_STATUS.en_attente },
    { key: 'validee', config: PHONE_STATUS.validee },
    { key: 'refusee', config: PHONE_STATUS.refusee },
    { key: 'vendue', config: PHONE_STATUS.vendue }
  ]

  return (
    <div className="space-y-4">
      {/* Paiements encaissés ce mois-ci */}
      <article className="card bg-brand-600 p-4 text-white">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-50/80">
          Paiements encaissés ce mois
        </p>
        <p className="mt-1 text-2xl font-extrabold">{formatPrice(stats.paiements.montantMois)}</p>
        <p className="mt-1 text-sm text-brand-50/90">
          {stats.paiements.nombreMois} paiement{stats.paiements.nombreMois > 1 ? 's' : ''} confirmé
          {stats.paiements.nombreMois > 1 ? 's' : ''}
        </p>
      </article>

      {/* Cartes de chiffres clés */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {cards.map((card) => (
          <article key={card.label} className="card p-4">
            <p className="text-xs text-slate-500">{card.label}</p>
            <p
              className={`mt-1 text-2xl font-extrabold ${
                card.accent === 'sun' ? 'text-sun-600' : 'text-slate-900'
              }`}
            >
              {card.value}
            </p>
          </article>
        ))}
      </div>

      {/* Répartition des annonces */}
      <article className="card p-4">
        <h2 className="text-sm font-bold text-slate-900">Annonces par statut</h2>
        <ul className="mt-3 space-y-2">
          {repartition.map(({ key, config }) => (
            <li key={key} className="flex items-center justify-between gap-2 text-sm">
              <StatusBadge config={config} />
              <span className="font-bold text-slate-800">{stats.annonces[key]}</span>
            </li>
          ))}
        </ul>
      </article>

      {/* Derniers utilisateurs inscrits */}
      <article className="card p-4">
        <h2 className="text-sm font-bold text-slate-900">Derniers inscrits</h2>
        {stats.derniersUtilisateurs.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">Aucun utilisateur pour le moment.</p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100">
            {stats.derniersUtilisateurs.map((user) => (
              <li key={user.id} className="flex items-center justify-between gap-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-800">
                    {user.full_name || 'Utilisateur'}
                  </p>
                  <p className="truncate text-xs text-slate-500">{user.email}</p>
                </div>
                <span className="shrink-0 text-xs text-slate-400">
                  {formatDate(user.created_at)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </article>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Ligne d'un détail (petit libellé + valeur)
// ---------------------------------------------------------------------------

function Detail({ label, value }) {
  if (!value) return null
  return (
    <div>
      <dt className="text-xs text-slate-400">{label}</dt>
      <dd className="font-medium text-slate-700">{value}</dd>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Carte d'une annonce
// ---------------------------------------------------------------------------

function PhoneRow({ phone, onStatus, onDelete }) {
  const seller = phone.profiles

  return (
    <article className="card overflow-hidden">
      {/* Photos en petites vignettes */}
      {phone.images?.length > 0 ? (
        <div className="flex gap-2 overflow-x-auto p-3">
          {phone.images.map((url, index) => (
            <img
              key={index}
              src={url}
              alt={`${phone.brand} ${phone.model} ${index + 1}`}
              loading="lazy"
              className="h-20 w-20 shrink-0 rounded-lg object-cover"
            />
          ))}
        </div>
      ) : (
        <p className="p-3 text-sm text-slate-400">Aucune photo</p>
      )}

      <div className="space-y-3 px-4 pb-4">
        {/* Titre + prix */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-base font-bold text-slate-900">
            {phone.brand} {phone.model}
          </h3>
          <p className="text-lg font-extrabold text-brand-700">{formatPrice(phone.price)}</p>
        </div>

        {/* Statut + date */}
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge config={PHONE_STATUS[phone.status]} />
          <span className="text-xs text-slate-400">{formatDate(phone.created_at)}</span>
        </div>

        {/* Caractéristiques */}
        <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
          <Detail label="État" value={conditionLabel(phone.condition)} />
          <Detail label="Stockage" value={phone.storage} />
          <Detail label="RAM" value={phone.ram} />
          <Detail label="Couleur" value={phone.color} />
          <Detail label="Ville" value={phone.city} />
        </dl>

        {phone.accessories && (
          <p className="text-sm text-slate-600">
            <span className="font-semibold">Accessoires : </span>
            {phone.accessories}
          </p>
        )}
        {phone.issues && (
          <p className="text-sm text-alert-600">
            <span className="font-semibold">Problèmes : </span>
            {phone.issues}
          </p>
        )}
        {phone.description && (
          <p className="whitespace-pre-line text-sm text-slate-600">{phone.description}</p>
        )}

        {/* Vendeur */}
        <div className="rounded-xl bg-slate-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Vendeur</p>
          <p className="mt-1 font-semibold text-slate-800">
            {seller?.full_name || 'Vendeur inconnu'}
          </p>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
            {seller?.phone && (
              <a
                href={`tel:${seller.phone}`}
                className="inline-flex items-center gap-1 text-brand-700 hover:underline"
              >
                <IconPhone className="h-4 w-4" />
                {seller.phone}
              </a>
            )}
            {seller?.whatsapp && (
              <a
                href={whatsappLink(
                  seller.whatsapp,
                  `Bonjour, au sujet de votre annonce ${phone.brand} ${phone.model} sur LAKERS STORE.`
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[#25D366] hover:underline"
              >
                <IconWhatsApp className="h-4 w-4" />
                WhatsApp
              </a>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2 pt-1">
          <button
            type="button"
            className="btn-primary btn-sm"
            onClick={() => onStatus(phone.id, 'validee')}
          >
            Valider
          </button>
          <button
            type="button"
            className="btn-danger btn-sm"
            onClick={() => onStatus(phone.id, 'refusee')}
          >
            Refuser
          </button>
          <button type="button" className="btn-ghost btn-sm" onClick={() => onDelete(phone)}>
            <IconTrash className="h-4 w-4" />
            Supprimer
          </button>
        </div>
      </div>
    </article>
  )
}

// ---------------------------------------------------------------------------
// Carte d'une demande d'achat
// ---------------------------------------------------------------------------

function RequestRow({ request, onStatus }) {
  const buyer = request.profiles
  const phone = request.phones
  const intent = INTENT_CONFIG[request.intent]

  return (
    <article className="card space-y-3 p-4">
      {/* Statuts + date */}
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge config={REQUEST_STATUS[request.status]} />
        {request.payment_status && <StatusBadge config={PAYMENT_STATUS[request.payment_status]} />}
        <span className="text-xs text-slate-400">{formatDate(request.created_at)}</span>
      </div>

      {/* Acheteur */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Acheteur</p>
        <p className="mt-1 font-semibold text-slate-800">{buyer?.full_name || 'Client inconnu'}</p>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {buyer?.whatsapp && (
            <a
              href={whatsappLink(
                buyer.whatsapp,
                `Bonjour ${buyer.full_name || ''}, au sujet de votre demande sur LAKERS STORE.`
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[#25D366] hover:underline"
            >
              <IconWhatsApp className="h-4 w-4" />
              WhatsApp
            </a>
          )}
          {buyer?.email && (
            <a
              href={`mailto:${buyer.email}`}
              className="inline-flex items-center gap-1 text-brand-700 hover:underline"
            >
              <IconMail className="h-4 w-4" />
              {buyer.email}
            </a>
          )}
          {buyer?.phone && (
            <a
              href={`tel:${buyer.phone}`}
              className="inline-flex items-center gap-1 text-slate-600 hover:underline"
            >
              <IconPhone className="h-4 w-4" />
              {buyer.phone}
            </a>
          )}
        </div>
      </div>

      {/* Téléphone visé */}
      {phone && (
        <div className="rounded-xl bg-slate-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Téléphone demandé
          </p>
          {phone.id ? (
            <Link
              to={`/telephone/${phone.id}`}
              className="mt-1 block font-semibold text-brand-700 hover:underline"
            >
              {phone.brand} {phone.model} — {formatPrice(phone.price)}
            </Link>
          ) : (
            <p className="mt-1 font-semibold text-slate-800">
              {phone.brand} {phone.model} — {formatPrice(phone.price)}
            </p>
          )}
          {phone.profiles?.whatsapp && (
            <a
              href={whatsappLink(
                phone.profiles.whatsapp,
                `Bonjour ${phone.profiles.full_name || ''}, votre ${phone.brand} ${phone.model} intéresse un acheteur.`
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-sm text-[#25D366] hover:underline"
            >
              <IconWhatsApp className="h-4 w-4" />
              Contacter le vendeur
            </a>
          )}
        </div>
      )}

      {/* Intention */}
      {intent && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-slate-400">Intention :</span>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${intent.className}`}>
            {intent.label}
          </span>
        </div>
      )}

      {/* Message de l'acheteur */}
      {request.message && (
        <p className="whitespace-pre-line rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
          {request.message}
        </p>
      )}

      {/* Informations de paiement */}
      {(request.payment_reference || request.payment_amount != null) && (
        <div className="space-y-1 text-sm text-slate-600">
          {request.payment_reference && (
            <p>
              Référence : <span className="font-medium">{request.payment_reference}</span>
            </p>
          )}
          {request.payment_amount != null && (
            <p>
              Montant : <span className="font-medium">{formatPrice(request.payment_amount)}</span>
            </p>
          )}
        </div>
      )}

      {/* Changement de statut */}
      <Field label="Statut de la demande" htmlFor={`request-status-${request.id}`}>
        <select
          id={`request-status-${request.id}`}
          className="field"
          value={request.status}
          onChange={(e) => onStatus(request.id, e.target.value)}
        >
          <option value="nouvelle">Nouvelle</option>
          <option value="en_cours">En cours</option>
          <option value="conclue">Conclue</option>
          <option value="annulee">Annulée</option>
        </select>
      </Field>
    </article>
  )
}

// ---------------------------------------------------------------------------
// Carte d'un utilisateur
// ---------------------------------------------------------------------------

function UserRow({ user, onFlags }) {
  return (
    <article className="card space-y-3 p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-bold text-slate-900">{user.full_name || 'Utilisateur'}</h3>
          <p className="text-xs text-slate-400">Inscrit le {formatDate(user.created_at)}</p>
        </div>
        <div className="flex flex-wrap justify-end gap-1">
          {user.is_admin && (
            <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-xs font-semibold text-white">
              Administrateur
            </span>
          )}
          {user.is_verified && <VerifiedBadge />}
          {user.is_blocked && (
            <span className="rounded-full bg-alert-500/15 px-2.5 py-0.5 text-xs font-semibold text-alert-600">
              Bloqué
            </span>
          )}
        </div>
      </div>

      {/* Coordonnées */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
        {user.email && (
          <a
            href={`mailto:${user.email}`}
            className="inline-flex items-center gap-1 text-slate-600 hover:text-brand-700"
          >
            <IconMail className="h-4 w-4" />
            {user.email}
          </a>
        )}
        {user.phone && (
          <a
            href={`tel:${user.phone}`}
            className="inline-flex items-center gap-1 text-slate-600 hover:text-brand-700"
          >
            <IconPhone className="h-4 w-4" />
            {user.phone}
          </a>
        )}
        {user.whatsapp && (
          <a
            href={whatsappLink(user.whatsapp)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[#25D366] hover:underline"
          >
            <IconWhatsApp className="h-4 w-4" />
            WhatsApp
          </a>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        {!user.is_admin && (
          <button
            type="button"
            className={user.is_blocked ? 'btn-primary btn-sm' : 'btn-danger btn-sm'}
            onClick={() =>
              onFlags(
                user.id,
                { is_blocked: !user.is_blocked },
                user.is_blocked ? 'Compte débloqué.' : 'Compte bloqué.'
              )
            }
          >
            {user.is_blocked ? 'Débloquer' : 'Bloquer'}
          </button>
        )}
        <button
          type="button"
          className={user.is_verified ? 'btn-ghost btn-sm' : 'btn-secondary btn-sm'}
          onClick={() =>
            onFlags(
              user.id,
              { is_verified: !user.is_verified },
              user.is_verified ? 'Vérification retirée.' : 'Vendeur vérifié.'
            )
          }
        >
          {user.is_verified ? 'Retirer la vérification' : 'Vérifier le vendeur'}
        </button>
      </div>
    </article>
  )
}
