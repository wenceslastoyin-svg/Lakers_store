// Page catalogue : filtres, recherche (avec debounce) et grille d'annonces

import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import Filters, { EMPTY_FILTERS } from '../components/Filters'
import PhoneCard from '../components/PhoneCard'
import { Alert, EmptyState, PhoneGridSkeleton } from '../components/ui'
import { IconFilter, IconSearch } from '../components/icons'
import { fetchPhones } from '../lib/api'

// Construit l'état des filtres à partir des paramètres d'URL (q, marque, ville)
function filtersFromParams(params) {
  return {
    ...EMPTY_FILTERS,
    search: params.get('q') || '',
    brand: params.get('marque') || '',
    city: params.get('ville') || ''
  }
}

export default function Catalogue() {
  const [searchParams, setSearchParams] = useSearchParams()

  const [filters, setFilters] = useState(() => filtersFromParams(searchParams))
  const [debouncedSearch, setDebouncedSearch] = useState(() => filtersFromParams(searchParams).search)
  const [showFilters, setShowFilters] = useState(false)

  const [phones, setPhones] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Recherche différée : on attend 350 ms après la dernière frappe
  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(filters.search), 350)
    return () => clearTimeout(id)
  }, [filters.search])

  // On reflète la recherche et quelques filtres dans l'URL (lien partageable)
  useEffect(() => {
    const next = {}
    if (debouncedSearch.trim()) next.q = debouncedSearch.trim()
    if (filters.brand) next.marque = filters.brand
    if (filters.city) next.ville = filters.city
    setSearchParams(next, { replace: true })
  }, [debouncedSearch, filters.brand, filters.city, setSearchParams])

  // Rechargement automatique dès qu'un filtre change
  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    fetchPhones({
      search: debouncedSearch,
      brand: filters.brand,
      minPrice: filters.minPrice,
      maxPrice: filters.maxPrice,
      condition: filters.condition,
      storage: filters.storage,
      city: filters.city,
      sort: filters.sort,
      limit: 100
    })
      .then((data) => {
        if (active) setPhones(data)
      })
      .catch((err) => {
        if (active) setError(err.message || 'Impossible de charger le catalogue.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [
    debouncedSearch,
    filters.brand,
    filters.minPrice,
    filters.maxPrice,
    filters.condition,
    filters.storage,
    filters.city,
    filters.sort
  ])

  const reset = () => setFilters(EMPTY_FILTERS)

  return (
    <div className="container-app space-y-5 py-6">
      <header>
        <h1 className="text-2xl font-black text-slate-900 sm:text-3xl">Catalogue</h1>
        <p className="mt-1 text-sm text-slate-500">
          Trouvez votre téléphone idéal grâce aux filtres. Tous les prix sont en FCFA.
        </p>
      </header>

      {/* Bouton pour replier/déplier les filtres (mobile uniquement) */}
      <button
        type="button"
        onClick={() => setShowFilters((v) => !v)}
        className="btn-ghost w-full lg:hidden"
        aria-expanded={showFilters}
      >
        <IconFilter className="h-5 w-5" />
        {showFilters ? 'Masquer les filtres' : 'Afficher les filtres'}
      </button>

      {/* Panneau de filtres : toujours visible sur grand écran */}
      <div className={`${showFilters ? 'block' : 'hidden'} lg:block`}>
        <Filters value={filters} onChange={setFilters} onReset={reset} />
      </div>

      {/* Compteur de résultats */}
      {!loading && !error && (
        <p className="text-sm text-slate-500">
          {phones.length} résultat{phones.length > 1 ? 's' : ''}
        </p>
      )}

      {loading && <PhoneGridSkeleton count={8} />}

      {!loading && error && <Alert type="error">{error}</Alert>}

      {!loading && !error && phones.length === 0 && (
        <EmptyState
          icon={IconSearch}
          title="Aucun téléphone trouvé"
          description="Essayez de modifier vos filtres ou votre recherche."
          action={
            <button type="button" onClick={reset} className="btn-primary btn-sm">
              Réinitialiser
            </button>
          }
        />
      )}

      {!loading && !error && phones.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {phones.map((phone) => (
            <PhoneCard key={phone.id} phone={phone} />
          ))}
        </div>
      )}
    </div>
  )
}
