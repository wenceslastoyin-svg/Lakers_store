// Routes protégées : accès réservé aux utilisateurs connectés / à l'administrateur

import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { PageLoader } from './ui'

// Nécessite un compte (pour vendre, demander à acheter, gérer ses favoris)
export function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth()
  const location = useLocation()

  if (loading) return <PageLoader />

  if (!isAuthenticated) {
    // On mémorise la page demandée pour y revenir après connexion
    return <Navigate to="/connexion" replace state={{ from: location.pathname }} />
  }

  return children
}

// Nécessite le compte administrateur
export function AdminRoute({ children }) {
  const { isAuthenticated, isAdmin, loading } = useAuth()
  const location = useLocation()

  if (loading) return <PageLoader />

  if (!isAuthenticated) {
    return <Navigate to="/connexion" replace state={{ from: location.pathname }} />
  }

  if (!isAdmin) {
    return (
      <div className="container-app py-20 text-center">
        <h1 className="text-2xl font-bold text-slate-900">Accès refusé</h1>
        <p className="mt-2 text-slate-500">
          Cette page est réservée à l’administrateur de LAKERS STORE.
        </p>
      </div>
    )
  }

  return children
}
