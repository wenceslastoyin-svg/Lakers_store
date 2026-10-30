// Partage d'une annonce sur WhatsApp (et copie du lien en secours)

import { useState } from 'react'
import { sharePhoneMessage } from '../lib/format'
import { IconCheck, IconShare } from './icons'

export default function ShareButton({ phone, className = '' }) {
  const [copied, setCopied] = useState(false)

  const handleShare = async () => {
    const message = sharePhoneMessage(phone)

    // Sur mobile : ouverture de l'application WhatsApp
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank', 'noopener')

    // Copie du lien dans le presse-papier (pratique si l'utilisateur annule)
    try {
      await navigator.clipboard.writeText(message)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* le presse-papier peut être indisponible : on ignore */
    }
  }

  return (
    <button type="button" onClick={handleShare} className={`btn-ghost ${className}`}>
      {copied ? <IconCheck /> : <IconShare />}
      {copied ? 'Lien copié' : 'Partager'}
    </button>
  )
}
