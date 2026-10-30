// Filtres du catalogue : recherche, marque, prix, état, stockage, ville, tri

import { BRANDS, CITIES, CONDITIONS, STORAGE_OPTIONS } from '../lib/constants'
import { IconClose, IconFilter, IconSearch } from './icons'

export const EMPTY_FILTERS = {
  search: '',
  brand: '',
  minPrice: '',
  maxPrice: '',
  condition: '',
  storage: '',
  city: '',
  sort: 'recent'
}

export default function Filters({ value, onChange, onReset, showHeader = true }) {
  const update = (key, next) => onChange({ ...value, [key]: next })

  const activeCount = [
    value.search,
    value.brand,
    value.minPrice,
    value.maxPrice,
    value.condition,
    value.storage,
    value.city
  ].filter(Boolean).length

  return (
    <section className="card p-4">
      {showHeader && (
        <div className="mb-4 flex items-center justify-between">
          <h2 className="inline-flex items-center gap-2 text-sm font-bold text-slate-800">
            <IconFilter className="h-4 w-4 text-brand-600" />
            Filtres
            {activeCount > 0 && (
              <span className="rounded-full bg-brand-600 px-2 py-0.5 text-xs font-bold text-white">
                {activeCount}
              </span>
            )}
          </h2>
          {activeCount > 0 && (
            <button
              type="button"
              onClick={onReset}
              className="inline-flex items-center gap-1 text-sm font-semibold text-alert-600 hover:underline"
            >
              <IconClose className="h-4 w-4" />
              Réinitialiser
            </button>
          )}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Recherche libre */}
        <div className="sm:col-span-2 lg:col-span-4">
          <label className="label" htmlFor="filter-search">
            Rechercher
          </label>
          <div className="relative">
            <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              id="filter-search"
              type="search"
              className="field pl-11"
              placeholder="Marque, modèle, description…"
              value={value.search}
              onChange={(e) => update('search', e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="label" htmlFor="filter-brand">
            Marque
          </label>
          <select
            id="filter-brand"
            className="field"
            value={value.brand}
            onChange={(e) => update('brand', e.target.value)}
          >
            <option value="">Toutes les marques</option>
            {BRANDS.map((brand) => (
              <option key={brand} value={brand}>
                {brand}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label" htmlFor="filter-condition">
            État
          </label>
          <select
            id="filter-condition"
            className="field"
            value={value.condition}
            onChange={(e) => update('condition', e.target.value)}
          >
            <option value="">Tous les états</option>
            {CONDITIONS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label" htmlFor="filter-storage">
            Stockage
          </label>
          <select
            id="filter-storage"
            className="field"
            value={value.storage}
            onChange={(e) => update('storage', e.target.value)}
          >
            <option value="">Tous les stockages</option>
            {STORAGE_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label" htmlFor="filter-city">
            Ville
          </label>
          <select
            id="filter-city"
            className="field"
            value={value.city}
            onChange={(e) => update('city', e.target.value)}
          >
            <option value="">Toutes les villes</option>
            {CITIES.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label" htmlFor="filter-min">
            Prix minimum (FCFA)
          </label>
          <input
            id="filter-min"
            type="number"
            min="0"
            inputMode="numeric"
            className="field"
            placeholder="0"
            value={value.minPrice}
            onChange={(e) => update('minPrice', e.target.value)}
          />
        </div>

        <div>
          <label className="label" htmlFor="filter-max">
            Prix maximum (FCFA)
          </label>
          <input
            id="filter-max"
            type="number"
            min="0"
            inputMode="numeric"
            className="field"
            placeholder="500 000"
            value={value.maxPrice}
            onChange={(e) => update('maxPrice', e.target.value)}
          />
        </div>

        <div className="sm:col-span-2">
          <label className="label" htmlFor="filter-sort">
            Trier par
          </label>
          <select
            id="filter-sort"
            className="field"
            value={value.sort}
            onChange={(e) => update('sort', e.target.value)}
          >
            <option value="recent">Plus récents</option>
            <option value="price_asc">Prix croissant</option>
            <option value="price_desc">Prix décroissant</option>
          </select>
        </div>
      </div>
    </section>
  )
}
