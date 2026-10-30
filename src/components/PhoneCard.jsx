// Carte produit affichée dans le catalogue et sur l'accueil

import { Link } from 'react-router-dom'
import { conditionLabel } from '../lib/constants'
import { formatPrice, timeAgo } from '../lib/format'
import FavoriteButton from './FavoriteButton'
import { VerifiedBadge } from './ui'
import { IconCamera, IconMapPin } from './icons'

export default function PhoneCard({ phone }) {
  const cover = phone.images?.[0]

  return (
    <article className="card group relative animate-fade-in-up overflow-hidden transition-shadow hover:shadow-lg">
      <Link to={`/telephone/${phone.id}`} className="block">
        {/* Photo principale */}
        <div className="relative aspect-square w-full overflow-hidden bg-slate-100">
          {cover ? (
            <img
              src={cover}
              alt={`${phone.brand} ${phone.model}`}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="grid h-full w-full place-items-center text-slate-300">
              <IconCamera className="h-10 w-10" />
            </div>
          )}

          {/* Nombre de photos */}
          {phone.images?.length > 1 && (
            <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-xs font-medium text-white">
              <IconCamera className="h-3.5 w-3.5" />
              {phone.images.length}
            </span>
          )}

          {/* Étiquette « Vendu » */}
          {phone.status === 'vendue' && (
            <span className="absolute left-2 top-2 rounded-full bg-slate-900/85 px-2.5 py-0.5 text-xs font-bold text-white">
              Vendu
            </span>
          )}
        </div>

        {/* Informations */}
        <div className="space-y-2 p-3">
          <div className="flex items-start justify-between gap-2">
            <h3 className="line-clamp-1 text-sm font-bold text-slate-900">
              {phone.brand} {phone.model}
            </h3>
            {phone.seller?.is_verified && <VerifiedBadge showLabel={false} />}
          </div>

          <p className="text-lg font-extrabold text-brand-700">{formatPrice(phone.price)}</p>

          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
            <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-medium text-slate-600">
              {conditionLabel(phone.condition)}
            </span>
            {phone.storage && <span>{phone.storage}</span>}
          </div>

          <div className="flex items-center justify-between gap-2 text-xs text-slate-400">
            <span className="inline-flex items-center gap-1">
              <IconMapPin className="h-3.5 w-3.5" />
              {phone.city}
            </span>
            <span>{timeAgo(phone.created_at)}</span>
          </div>
        </div>
      </Link>

      {/* Bouton favori (hors du lien pour ne pas déclencher la navigation) */}
      <FavoriteButton
        phoneId={phone.id}
        className="absolute right-2 top-2 opacity-95"
      />
    </article>
  )
}
