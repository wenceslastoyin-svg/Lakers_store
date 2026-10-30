// Page d'accueil : héro, recherche rapide, points de confiance et derniers téléphones

import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import PhoneCard from '../components/PhoneCard'
import ScamWarning from '../components/ScamWarning'
import { Alert, EmptyState, PhoneGridSkeleton } from '../components/ui'
import { IconMapPin, IconSearch, IconShield, IconWhatsApp } from '../components/icons'
import { fetchPhones } from '../lib/api'
import { SITE_NAME } from '../lib/constants'

// Trois arguments rassurants affichés sous le héro
const TRUST_ITEMS = [
  {
    icon: IconShield,
    title: 'Annonces vérifiées',
    text: 'Chaque annonce est contrôlée par l’administrateur avant publication.'
  },
  {
    icon: IconWhatsApp,
    title: 'Contact direct WhatsApp',
    text: 'Discutez directement avec le vendeur, sans intermédiaire.'
  },
  {
    icon: IconMapPin,
    title: 'Partout au Bénin',
    text: 'Des téléphones disponibles à Cotonou, Porto-Novo, Parakou et plus.'
  }
]

export default function Home() {
  const navigate = useNavigate()
  const [term, setTerm] = useState('')
  const [phones, setPhones] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Charge les derniers téléphones validés dès l'arrivée sur la page
  useEffect(() => {
    let active = true
    setLoading(true)
    fetchPhones({ limit: 8 })
      .then((data) => {
        if (active) setPhones(data)
      })
      .catch((err) => {
        if (active) setError(err.message || 'Impossible de charger les téléphones.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  // Lance la recherche : navigue vers le catalogue avec le terme saisi
  const handleSearch = (event) => {
    event.preventDefault()
    const q = term.trim()
    navigate(q ? `/catalogue?q=${encodeURIComponent(q)}` : '/catalogue')
  }

  return (
    <div className="container-app space-y-10 py-6">
      {/* ------------------------------- Héro -------------------------------- */}
      <section className="rounded-3xl bg-gradient-to-b from-brand-50 to-white px-5 py-8 sm:px-8 sm:py-12">
        <h1 className="text-2xl font-black leading-tight text-slate-900 sm:text-4xl">
          Achetez et vendez vos téléphones au Bénin en toute confiance
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-slate-600 sm:text-base">
          Des prix affichés en FCFA, des annonces vérifiées une par une par l’administrateur de{' '}
          {SITE_NAME} avant leur publication. Trouvez le bon téléphone, au bon prix, près de chez
          vous.
        </p>

        {/* Grand champ de recherche */}
        <form onSubmit={handleSearch} className="mt-6 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              className="field pl-11"
              placeholder="Rechercher une marque, un modèle…"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              aria-label="Rechercher un téléphone"
            />
          </div>
          <button type="submit" className="btn-primary sm:w-auto">
            <IconSearch className="h-5 w-5" />
            Rechercher
          </button>
        </form>

        {/* Deux grands boutons d'action */}
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Link to="/catalogue" className="btn-primary">
            Voir le catalogue
          </Link>
          <Link to="/vendre" className="btn-secondary">
            Vendre mon téléphone
          </Link>
        </div>
      </section>

      {/* --------------------------- Points de confiance --------------------- */}
      <section className="grid gap-3 sm:grid-cols-3">
        {TRUST_ITEMS.map(({ icon: Icon, title, text }) => (
          <div key={title} className="card p-4">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-700">
              <Icon className="h-5 w-5" />
            </span>
            <h3 className="mt-3 text-sm font-bold text-slate-900">{title}</h3>
            <p className="mt-1 text-sm text-slate-500">{text}</p>
          </div>
        ))}
      </section>

      {/* ----------------------------- Anti-arnaque -------------------------- */}
      <ScamWarning />

      {/* -------------------------- Derniers téléphones ---------------------- */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Derniers téléphones</h2>
          <Link to="/catalogue" className="text-sm font-semibold text-brand-700 hover:underline">
            Voir tout
          </Link>
        </div>

        {loading && (
          <PhoneGridSkeleton count={4} className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4" />
        )}

        {!loading && error && <Alert type="error">{error}</Alert>}

        {!loading && !error && phones.length === 0 && (
          <EmptyState
            icon={IconSearch}
            title="Aucune annonce pour le moment"
            description="Revenez bientôt : de nouveaux téléphones sont ajoutés régulièrement."
            action={
              <Link to="/vendre" className="btn-primary btn-sm">
                Vendre mon téléphone
              </Link>
            }
          />
        )}

        {!loading && !error && phones.length > 0 && (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
            {phones.map((phone) => (
              <PhoneCard key={phone.id} phone={phone} />
            ))}
          </div>
        )}

        <div className="pt-2">
          <Link to="/catalogue" className="btn-secondary w-full">
            Voir tout le catalogue
          </Link>
        </div>
      </section>
    </div>
  )
}
