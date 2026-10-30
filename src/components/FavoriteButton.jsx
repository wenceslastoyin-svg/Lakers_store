// Bouton favori (cœur) affiché sur les cartes et la page détail

import { useFavorites } from '../context/FavoritesContext'
import { IconHeart } from './icons'

export default function FavoriteButton({ phoneId, className = '' }) {
  const { isFavorite, toggleFavorite } = useFavorites()
  const active = isFavorite(phoneId)

  const handleClick = (event) => {
    event.preventDefault()
    event.stopPropagation()
    toggleFavorite(phoneId)
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={active}
      aria-label={active ? 'Retirer des favoris' : 'Ajouter aux favoris'}
      className={`grid h-10 w-10 place-items-center rounded-full bg-white/95 shadow-card
                  transition-colors ${active ? 'text-alert-600' : 'text-slate-400 hover:text-alert-500'} ${className}`}
    >
      <IconHeart filled={active} className="h-5 w-5" />
    </button>
  )
}
