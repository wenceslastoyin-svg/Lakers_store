// Fenêtre « Je veux l'acheter » : collecte les informations de l'acheteur,
// enregistre la demande puis, si l'acheteur veut payer tout de suite,
// redirige vers la page de paiement FedaPay (MTN MoMo / Moov Money / Celtiis Cash).

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createFedapayCheckout, createPurchaseRequest } from '../lib/api'
import { formatPrice } from '../lib/format'
import { useAuth } from '../context/AuthContext'
import { Field, Spinner, Alert } from './ui'
import { IconClose, IconLock, IconWhatsApp } from './icons'

export default function BuyRequestModal({ phone, onClose }) {
  const { user, profile } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState({
    buyer_name: '',
    buyer_whatsapp: '',
    message: '',
    intent: 'discuter'
  })
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState('')

  // Pré-remplit avec les informations du profil connecté
  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      buyer_name: profile?.full_name || '',
      buyer_whatsapp: profile?.whatsapp || profile?.phone || ''
    }))
  }, [profile])

  // Ferme la fenêtre avec la touche Échap et bloque le défilement en arrière-plan
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }))

  // Validation du formulaire
  const validate = () => {
    const next = {}
    if (form.buyer_name.trim().length < 2) next.buyer_name = 'Indiquez votre nom complet.'
    const digits = form.buyer_whatsapp.replace(/[^\d]/g, '')
    if (digits.length < 8) next.buyer_whatsapp = 'Numéro WhatsApp invalide (au moins 8 chiffres).'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setServerError('')
    if (!validate()) return

    setSubmitting(true)
    try {
      // 1) Enregistrement de la demande (déclenche l'e-mail à l'administrateur)
      const request = await createPurchaseRequest({
        phone_id: phone.id,
        buyer_id: user?.id ?? null,
        buyer_name: form.buyer_name.trim(),
        buyer_whatsapp: form.buyer_whatsapp.trim(),
        message: form.message.trim(),
        intent: form.intent
      })

      // 2) Paiement immédiat -> on ouvre la page de paiement FedaPay
      if (form.intent === 'payer_maintenant') {
        const { url } = await createFedapayCheckout(request.id)
        if (url) {
          window.location.href = url // redirection vers FedaPay (mobile money)
          return
        }
        throw new Error('La page de paiement n’a pas pu être créée.')
      }

      // 3) Simple discussion -> on confirme et on renvoie vers le téléphone
      navigate(`/paiement/${request.id}`, { state: { intent: 'discuter' } })
    } catch (err) {
      setServerError(err.message || 'Une erreur est survenue. Réessayez.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Demander le ${phone.brand} ${phone.model}`}
      onClick={onClose}
    >
      <div
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-5 shadow-xl sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* En-tête */}
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Je veux l’acheter</h2>
            <p className="text-sm text-slate-500">
              {phone.brand} {phone.model} —{' '}
              <span className="font-bold text-brand-700">{formatPrice(phone.price)}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200"
            aria-label="Fermer"
          >
            <IconClose />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Votre nom complet" htmlFor="buyer-name" error={errors.buyer_name} required>
            <input
              id="buyer-name"
              type="text"
              className={`field ${errors.buyer_name ? 'field-error' : ''}`}
              placeholder="Ex. : Aïcha Houngbédji"
              value={form.buyer_name}
              onChange={(e) => update('buyer_name', e.target.value)}
            />
          </Field>

          <Field
            label="Votre numéro WhatsApp"
            htmlFor="buyer-whatsapp"
            error={errors.buyer_whatsapp}
            hint="Format : +229 50 81 35 86"
            required
          >
            <input
              id="buyer-whatsapp"
              type="tel"
              inputMode="tel"
              className={`field ${errors.buyer_whatsapp ? 'field-error' : ''}`}
              placeholder="+229 …"
              value={form.buyer_whatsapp}
              onChange={(e) => update('buyer_whatsapp', e.target.value)}
            />
          </Field>

          <Field label="Message (optionnel)" htmlFor="buyer-message">
            <textarea
              id="buyer-message"
              rows={3}
              className="field resize-none"
              placeholder="Ex. : Je suis disponible demain à Cotonou."
              value={form.message}
              onChange={(e) => update('message', e.target.value)}
            />
          </Field>

          {/* Choix du mode : payer maintenant ou discuter d'abord */}
          <fieldset className="space-y-2">
            <legend className="label">Que voulez-vous faire ?</legend>

            <label
              className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors ${
                form.intent === 'payer_maintenant'
                  ? 'border-brand-500 bg-brand-50'
                  : 'border-slate-300 bg-white'
              }`}
            >
              <input
                type="radio"
                name="intent"
                value="payer_maintenant"
                checked={form.intent === 'payer_maintenant'}
                onChange={() => update('intent', 'payer_maintenant')}
                className="mt-1 h-5 w-5 accent-brand-600"
              />
              <span className="flex-1">
                <span className="flex items-center gap-2 font-semibold text-slate-900">
                  <IconLock className="h-4 w-4 text-brand-600" />
                  Je veux payer maintenant
                </span>
                <span className="mt-0.5 block text-xs text-slate-500">
                  Paiement sécurisé par MTN MoMo, Moov Money ou Celtiis Cash (FedaPay).
                </span>
              </span>
            </label>

            <label
              className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors ${
                form.intent === 'discuter' ? 'border-brand-500 bg-brand-50' : 'border-slate-300 bg-white'
              }`}
            >
              <input
                type="radio"
                name="intent"
                value="discuter"
                checked={form.intent === 'discuter'}
                onChange={() => update('intent', 'discuter')}
                className="mt-1 h-5 w-5 accent-brand-600"
              />
              <span className="flex-1">
                <span className="flex items-center gap-2 font-semibold text-slate-900">
                  <IconWhatsApp className="h-4 w-4 text-[#25D366]" />
                  Je veux d’abord discuter
                </span>
                <span className="mt-0.5 block text-xs text-slate-500">
                  L’administrateur vous contacte sur WhatsApp avant tout paiement.
                </span>
              </span>
            </label>
          </fieldset>

          {serverError && <Alert type="error">{serverError}</Alert>}

          <Alert type="warning">
            Ne payez jamais avant d’avoir vu le téléphone.
          </Alert>

          <div className="flex flex-col gap-2 sm:flex-row-reverse">
            <button type="submit" className="btn-primary flex-1" disabled={submitting}>
              {submitting && <Spinner className="h-5 w-5" />}
              {submitting
                ? 'Envoi…'
                : form.intent === 'payer_maintenant'
                  ? `Payer ${formatPrice(phone.price)}`
                  : 'Envoyer ma demande'}
            </button>
            <button type="button" onClick={onClose} className="btn-ghost flex-1">
              Annuler
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
