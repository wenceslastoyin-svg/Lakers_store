// Avertissement anti-arnaque affiché sur les pages d'annonce

import { SCAM_WARNING } from '../lib/constants'
import { IconAlert } from './icons'

export default function ScamWarning({ className = '' }) {
  return (
    <div
      className={`flex items-start gap-3 rounded-2xl border border-alert-500/30 bg-alert-500/10 px-4 py-3 ${className}`}
      role="alert"
    >
      <IconAlert className="mt-0.5 h-5 w-5 shrink-0 text-alert-600" />
      <div className="text-sm">
        <p className="font-bold text-alert-700">{SCAM_WARNING}</p>
        <p className="mt-0.5 text-alert-700/80">
          Vérifiez l’appareil, son IMEI et son état avant tout paiement. Rencontrez le vendeur dans
          un lieu public.
        </p>
      </div>
    </div>
  )
}
