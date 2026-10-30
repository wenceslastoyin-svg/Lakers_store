// Page « Mes favoris » : liste des annonces mises de côté par l'utilisateur connecté

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import PhoneCard from '../components/PhoneCard'
import { Alert, EmptyState, PhoneGridSkeleton } from '../components/ui'
import { IconHeart } from '../components/icons'
import { useAuth } from '../context/AuthContext'
import { fetchFavorites } from '../lib/api'

export default function Favorites() {
  // L'utilisateur est forcément connecté (page protégée par ProtectedRoute)
  const { user } = useAuth()
  const [phones, setPhones] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user) return undefined
    let active = true
    setLoading(true)
    setError('')
    fetchFavorites(user.id)
      .then((data) => {
        if (active) setPhones(data)
      })
      .catch((err) => {
        if (active) setError(err.message || 'Impossible de charger vos favoris.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [user])

  return (
    <div className="container-app space-y-5 py-6">
      <header>
        <h1 className="inline-flex items-center gap-2 text-2xl font-black text-slate-900 sm:text-3xl">
          <IconHeart className="h-6 w-6 text-alert-600" />
          Mes favoris
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Retrouvez ici tous les téléphones que vous avez enregistrés.
        </p>
      </header>

      {loading && (
        <PhoneGridSkeleton count={4} className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4" />
      )}

      {!loading && error && <Alert type="error">{error}</Alert>}

      {!loading && !error && phones.length === 0 && (
        <EmptyState
          icon={IconHeart}
          title="Aucun favori"
          description="Touchez le cœur sur une annonce pour la retrouver ici."
          action={
            <Link to="/catalogue" className="btn-primary btn-sm">
              Parcourir le catalogue
            </Link>
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
