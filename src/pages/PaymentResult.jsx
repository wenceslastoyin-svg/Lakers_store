// Page de retour après une demande d'achat / un paiement FedaPay

import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom'
import { Alert, PageLoader, StatusBadge } from '../components/ui'
import { IconCheck, IconAlert, IconWhatsApp, IconClock, IconCart } from '../components/icons'
import { fetchPurchaseRequestById, verifyFedapayPayment } from '../lib/api'
import { PAYMENT_STATUS } from '../lib/constants'
import { adminWhatsappLink, formatPrice } from '../lib/format'

export default function PaymentResult() {
  const { requestId } = useParams()
  const location = useLocation()
  const [searchParams] = useSearchParams()

  const [request, setRequest] = useState(null)
  const [loading, setLoading] = useState(true)
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState('')

  // Cas « Je veux d'abord discuter » : aucune vérification de paiement nécessaire
  const isDiscussion = location.state?.intent === 'discuter'

  // Vérifie le paiement auprès de FedaPay puis recharge la demande
  const verify = useCallback(async () => {
    setChecking(true)
    try {
      // FedaPay renvoie aussi son propre statut dans l'URL de retour
      const fedaStatus = searchParams.get('status')
      if (fedaStatus) await verifyFedapayPayment(requestId)
      const data = await fetchPurchaseRequestById(requestId)
      setRequest(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setChecking(false)
      setLoading(false)
    }
  }, [requestId, searchParams])

  useEffect(() => {
    if (isDiscussion) {
      fetchPurchaseRequestById(requestId)
        .then(setRequest)
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false))
      return
    }
    verify()
  }, [isDiscussion, requestId, verify])

  if (loading) return <PageLoader label="Vérification du paiement…" />

  if (error) {
    return (
      <div className="container-app py-10">
        <Alert type="error">Impossible de retrouver votre demande : {error}</Alert>
        <Link to="/catalogue" className="btn-primary mt-4">
          Retour au catalogue
        </Link>
      </div>
    )
  }

  if (!request) {
    return (
      <div className="container-app py-10">
        <Alert type="warning">Cette demande d’achat est introuvable.</Alert>
        <Link to="/catalogue" className="btn-primary mt-4">
          Retour au catalogue
        </Link>
      </div>
    )
  }

  const phone = request.phones
  const title = phone ? `${phone.brand} ${phone.model}` : 'Téléphone'
  const price = request.payment_amount || phone?.price

  // ---------------------------------------------------------------------------
  // Cas 1 : l'acheteur voulait d'abord discuter
  // ---------------------------------------------------------------------------
  if (isDiscussion) {
    return (
      <div className="container-app max-w-xl py-10">
        <div className="card p-6 text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-brand-50 text-brand-600">
            <IconCheck className="h-8 w-8" />
          </div>
          <h1 className="mt-4 text-xl font-bold text-slate-900">Demande envoyée !</h1>
          <p className="mt-2 text-sm text-slate-500">
            Votre demande pour <strong>{title}</strong> a bien été transmise à l’administrateur de
            LAKERS STORE. Il vous contactera sur WhatsApp au{' '}
            <strong>{request.buyer_whatsapp}</strong> pour convenir de la remise.
          </p>

          <div className="mt-4 text-left">
            <Alert type="warning">Ne payez jamais avant d’avoir vu le téléphone.</Alert>
          </div>

          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            <a
              href={adminWhatsappLink(`Bonjour, je suis ${request.buyer_name}. J’ai demandé ${title}.`)}
              target="_blank"
              rel="noopener noreferrer"
              className="btn bg-[#25D366] text-white hover:brightness-95"
            >
              <IconWhatsApp />
              Écrire sur WhatsApp
            </a>
            <Link to="/catalogue" className="btn-ghost">
              Continuer mes achats
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // Cas 2 : paiement mobile money
  // ---------------------------------------------------------------------------
  const paid = request.payment_status === 'paye'
  const failed = request.payment_status === 'echoue'

  return (
    <div className="container-app max-w-xl py-10">
      <div className="card p-6 text-center">
        <div
          className={`mx-auto grid h-16 w-16 place-items-center rounded-full ${
            paid
              ? 'bg-brand-50 text-brand-600'
              : failed
                ? 'bg-alert-500/10 text-alert-600'
                : 'bg-sun-400/20 text-sun-600'
          }`}
        >
          {paid ? (
            <IconCheck className="h-8 w-8" />
          ) : failed ? (
            <IconAlert className="h-8 w-8" />
          ) : (
            <IconClock className="h-8 w-8" />
          )}
        </div>

        <h1 className="mt-4 text-xl font-bold text-slate-900">
          {paid
            ? 'Paiement confirmé'
            : failed
              ? 'Paiement échoué'
              : 'Paiement en attente de confirmation'}
        </h1>

        <p className="mt-2 text-sm text-slate-500">
          {paid
            ? `Votre paiement de ${formatPrice(price)} pour ${title} a bien été reçu. L’administrateur vous contacte pour la remise.`
            : failed
              ? `Le paiement de ${formatPrice(price)} pour ${title} n’a pas abouti. Vous pouvez réessayer ou discuter avec l’administrateur.`
              : `Votre paiement de ${formatPrice(price)} pour ${title} est en cours de traitement. Confirmez sur votre téléphone si votre opérateur vous le demande, puis actualisez cette page.`}
        </p>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <StatusBadge config={PAYMENT_STATUS[request.payment_status]} />
          {request.payment_reference && (
            <span className="rounded-full bg-slate-100 px-3 py-0.5 text-xs text-slate-500">
              Réf. {request.payment_reference}
            </span>
          )}
        </div>

        <div className="mt-4 text-left">
          <Alert type="warning">Ne payez jamais avant d’avoir vu le téléphone.</Alert>
        </div>

        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <button type="button" onClick={verify} className="btn-primary" disabled={checking}>
            <IconClock />
            {checking ? 'Vérification…' : 'Actualiser le statut'}
          </button>
          <a
            href={adminWhatsappLink(
              `Bonjour, je suis ${request.buyer_name}. Ma demande pour ${title} (réf. ${
                request.payment_reference || request.id
              }).`
            )}
            target="_blank"
            rel="noopener noreferrer"
            className="btn bg-[#25D366] text-white hover:brightness-95"
          >
            <IconWhatsApp />
            Contacter sur WhatsApp
          </a>
        </div>

        <Link
          to="/catalogue"
          className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:underline"
        >
          <IconCart className="h-4 w-4" />
          Continuer mes achats
        </Link>
      </div>
    </div>
  )
}
