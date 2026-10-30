// Contexte des favoris : charge une seule fois la liste des favoris de l'acheteur
// connecté, pour éviter une requête par carte produit.

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { addFavorite, fetchFavoriteIds, removeFavorite } from '../lib/api'
import { useAuth } from './AuthContext'

const FavoritesContext = createContext(null)

export function FavoritesProvider({ children }) {
  const { user, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [favoriteIds, setFavoriteIds] = useState([])

  // Recharge les favoris à la connexion, vide la liste à la déconnexion
  useEffect(() => {
    let active = true
    if (!isAuthenticated || !user) {
      setFavoriteIds([])
      return undefined
    }
    fetchFavoriteIds(user.id)
      .then((ids) => {
        if (active) setFavoriteIds(ids)
      })
      .catch((err) => console.error('Chargement des favoris :', err.message))
    return () => {
      active = false
    }
  }, [isAuthenticated, user])

  const isFavorite = useCallback((phoneId) => favoriteIds.includes(phoneId), [favoriteIds])

  // Ajoute ou retire un favori ; redirige vers la connexion si besoin
  const toggleFavorite = useCallback(
    async (phoneId, redirectTo) => {
      if (!isAuthenticated || !user) {
        navigate('/connexion', { state: { from: redirectTo || `/telephone/${phoneId}` } })
        return
      }
      const already = favoriteIds.includes(phoneId)
      // Mise à jour optimiste pour une interface instantanée
      setFavoriteIds((ids) => (already ? ids.filter((id) => id !== phoneId) : [...ids, phoneId]))
      try {
        if (already) await removeFavorite(user.id, phoneId)
        else await addFavorite(user.id, phoneId)
      } catch (err) {
        console.error('Favori :', err.message)
        // Retour à l'état précédent en cas d'erreur
        setFavoriteIds((ids) => (already ? [...ids, phoneId] : ids.filter((id) => id !== phoneId)))
      }
    },
    [favoriteIds, isAuthenticated, user, navigate]
  )

  const value = useMemo(
    () => ({ favoriteIds, isFavorite, toggleFavorite }),
    [favoriteIds, isFavorite, toggleFavorite]
  )

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>
}

export function useFavorites() {
  const context = useContext(FavoritesContext)
  if (!context) throw new Error('useFavorites doit être utilisé dans FavoritesProvider.')
  return context
}
