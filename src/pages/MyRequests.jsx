// Page « Mes demandes d'achat » : suivi des demandes faites par l'acheteur.
// On y voit l'état de la demande, l'état du paiement mobile money, la référence
// FedaPay, et un bouton « Reprendre le paiement » quand le paiement a échoué.

import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { PAYMENT_STATUS, REQUEST_STATUS } from '../lib/constants'
import { formatDate, formatPrice, adminWhatsappLink } from '../lib/format'
import { createFedapayCheckout, fetchMyPurchaseRequests } from '../lib/api'
import { Alert, EmptyState, PageLoader, StatusBadge } from '../components/ui'
import { IconCart, IconClock, IconWhatsApp } from '../components/icons'

// Libellés lisibles de l'intention d'achat
const INTENT_LABELS = {
  payer_maintenant: 'Payer maintenant',
  discuter: 'Discuter d’abord'
}

export default function MyRequests() {
  const { user } = useAuth()

  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [alert, setAlert] = useState(null)
  const [busyId, setBusyId] = useState(null)

  const alertTimer = useRef(null)

  // Affiche un message puis le fait disparaître après quelques secondes
  const flash = (type, message) => {
    setAlert({ type, message })
    window.clearTimeout(alertTimer.current)
    alertTimer.current = window.setTimeout(() => setAlert(null), 4000)
  }

  // Chargement des demandes de l'acheteur connecté
  const load = useCallback(async () => {
    if (!user?.id) return
    setLoading(true)
    try {
      const data = await fetchMyPurchaseRequests(user.id)
      setRequests(data ?? [])
    } catch (err) {
      flash('error', err.message || 'Chargement impossible.')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    load()
    return () => window.clearTimeout(alertTimer.current)
  }, [load])

  // Relance un paiement FedaPay pour une demande dont le paiement a échoué
  const handleRetryPayment = async (request) => {
    setBusyId(request.id)
    try {
      const { url } = await createFedapayCheckout(request.id)
      if (url) {
        window.location.href = url // redirection vers la page de paiement FedaPay
        return
      }
      throw new Error('La page de paiement n’a pas pu être créée.')
    } catch (err) {
      flash('error', err.message || 'Paiement impossible pour le moment.')
      setBusyId(null)
    }
  }

  if (loading) return <PageLoader label="Chargement de vos demandes…" />

  return (
    <div className="container-app py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Mes demandes d’achat</h1>
          <p className="mt-1 text-sm text-slate-500">
            Suivez l’état de vos demandes et de vos paiements mobile money.
          </p>
        </div>
        <Link to="/catalogue" className="btn-secondary btn-sm">
          Parcourir le catalogue
        </Link>
      </div>

      {alert && (
        <Alert type={alert.type} className="mt-4">
          {alert.message}
        </Alert>
      )}

      {requests.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            icon={IconCart}
            title="Aucune demande d’achat"
            description="Vous n’avez pas encore demandé de téléphone. Parcourez le catalogue et cliquez sur « Je veux l’acheter »."
            action={
              <Link to="/catalogue" className="btn-primary mt-1">
                Voir le catalogue
              </Link>
            }
          />
        </div>
      ) : (
        <ul className="mt-6 space-y-4">
          {requests.map((request) => {
            const phone = request.phones
            const title = phone ? `${phone.brand} ${phone.model}` : 'Téléphone supprimé'
            const price = request.payment_amount ?? phone?.price
            const canRetry =
              request.intent === 'payer_maintenant' && request.payment_status === 'echoue'
            const busy = busyId === request.id

            return (
              <li key={request.id} className="card space-y-3 p-4">
                {/* Titre + prix */}
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">{title}</h2>
                    <p className="text-lg font-extrabold text-brand-700">{formatPrice(price)}</p>
                  </div>
                  <span className="text-xs text-slate-400">{formatDate(request.created_at)}</span>
                </div>

                {/* Statuts */}
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge config={REQUEST_STATUS[request.status]} />
                  <StatusBadge config={PAYMENT_STATUS[request.payment_status]} />
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                    {INTENT_LABELS[request.intent] ?? request.intent}
                  </span>
                </div>

                {/* Référence FedaPay */}
                {request.payment_reference && (
                  <p className="text-xs text-slate-500">
                    Référence de paiement :{' '}
                    <span className="font-medium text-slate-700">{request.payment_reference}</span>
                  </p>
                )}

                {/* Message envoyé à l'administrateur */}
                {request.message && (
                  <p className="whitespace-pre-line rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
                    {request.message}
                  </p>
                )}

                {/* Explication du statut du paiement */}
                {request.intent === 'payer_maintenant' && request.payment_status === 'echoue' && (
                  <p className="rounded-xl bg-alert-500/10 px-3 py-2 text-sm text-alert-700">
                    Le paiement n’a pas abouti. Vous pouvez réessayer, ou contacter l’administrateur
                    sur WhatsApp.
                  </p>
                )}
                {request.intent === 'payer_maintenant' && request.payment_status === 'en_attente' && (
                  <p className="rounded-xl bg-sun-400/15 px-3 py-2 text-sm text-sun-600">
                    Paiement en cours de traitement. Confirmez sur votre téléphone si votre opérateur
                    vous le demande.
                  </p>
                )}
                {request.intent === 'discuter' && (
                  <p className="rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-600">
                    L’administrateur vous contacte sur WhatsApp pour convenir de la remise.
                  </p>
                )}

                {/* Actions */}
                <div className="flex flex-wrap gap-2 pt-1">
                  {canRetry && (
                    <button
                      type="button"
                      onClick={() => handleRetryPayment(request)}
                      disabled={busy}
                      className="btn-primary btn-sm"
                    >
                      <IconClock className="h-4 w-4" />
                      {busy ? 'Redirection…' : 'Reprendre le paiement'}
                    </button>
                  )}

                  {phone?.id && (
                    <Link to={`/telephone/${phone.id}`} className="btn-secondary btn-sm">
                      Voir l’annonce
                    </Link>
                  )}

                  <a
                    href={adminWhatsappLink(
                      `Bonjour, je suis ${request.buyer_name}. Ma demande pour ${title}${
                        request.payment_reference ? ` (réf. ${request.payment_reference})` : ''
                      }.`
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-sm bg-[#25D366] text-white hover:brightness-95"
                  >
                    <IconWhatsApp className="h-4 w-4" />
                    Contacter LAKERS STORE
                  </a>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
