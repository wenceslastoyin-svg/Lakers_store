// Page d'inscription : création de compte vendeur / acheteur

import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Alert, Field, Spinner } from '../components/ui'

// Nettoie un numéro : on ne garde que les chiffres (supprime +, espaces, tirets…)
function cleanDigits(value) {
  return String(value || '').replace(/\D/g, '')
}

// Valide un numéro béninois : 8 à 13 chiffres, avec ou sans indicatif +229
function isValidBeninPhone(value) {
  const digits = cleanDigits(value)
  if (/^229\d{8}$/.test(digits)) return true // avec indicatif +229
  return /^\d{8,13}$/.test(digits)
}

// Vérifie un numéro WhatsApp (même tolérance que le téléphone)
function isValidWhatsApp(value) {
  const digits = cleanDigits(value)
  if (!digits) return false
  if (/^229\d{8}$/.test(digits)) return true
  return /^\d{8,13}$/.test(digits)
}

// Vérifie le format d'une adresse e-mail
function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim())
}

export default function Register() {
  const { signUp, isAuthenticated, loading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // Page demandée avant la redirection vers la connexion (sinon accueil)
  const redirectTo = location.state?.from || '/'

  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    whatsapp: '',
    password: '',
    confirm: ''
  })
  const [sameAsPhone, setSameAsPhone] = useState(true)
  const [errors, setErrors] = useState({})
  const [alert, setAlert] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  // Déjà connecté → retour immédiat
  useEffect(() => {
    if (!loading && isAuthenticated) navigate(redirectTo, { replace: true })
  }, [loading, isAuthenticated, navigate, redirectTo])

  // Mise à jour d'un champ ; recopie automatique du téléphone dans WhatsApp
  const update = (key, value) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value }
      if (key === 'phone' && sameAsPhone) next.whatsapp = value
      return next
    })
  }

  // Case « le WhatsApp est le même que le téléphone »
  const toggleSameAsPhone = (checked) => {
    setSameAsPhone(checked)
    if (checked) setForm((prev) => ({ ...prev, whatsapp: prev.phone }))
  }

  // Validation complète du formulaire
  const validate = (values) => {
    const next = {}
    if (values.fullName.trim().length < 2) next.fullName = 'Indiquez votre nom complet (2 caractères minimum).'
    if (!isValidEmail(values.email)) next.email = 'Adresse e-mail invalide.'
    if (!isValidBeninPhone(values.phone)) next.phone = 'Numéro invalide (8 à 13 chiffres, ex. 0197000000 ou +229…).'
    if (!isValidWhatsApp(values.whatsapp)) next.whatsapp = 'Numéro WhatsApp invalide.'
    if (values.password.length < 6) next.password = 'Le mot de passe doit contenir au moins 6 caractères.'
    if (values.confirm !== values.password) next.confirm = 'Les deux mots de passe ne correspondent pas.'
    return next
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    const nextErrors = validate(form)
    setErrors(nextErrors)
    setAlert(null)
    if (Object.keys(nextErrors).length > 0) return

    setSubmitting(true)
    try {
      await signUp({
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        whatsapp: form.whatsapp.trim(),
        password: form.password
      })
      setAlert({
        type: 'success',
        message:
          'Votre compte a bien été créé. Un e-mail de confirmation peut être nécessaire avant votre première connexion.'
      })
      // Redirection après un court délai pour laisser lire le message
      window.setTimeout(() => navigate(redirectTo, { replace: true }), 2200)
    } catch (err) {
      setAlert({ type: 'error', message: err.message || 'Inscription impossible pour le moment.' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="container-app py-8">
      <div className="mx-auto max-w-md">
        <h1 className="text-2xl font-extrabold text-slate-900">Créer un compte</h1>
        <p className="mt-1 text-sm text-slate-500">
          Rejoignez LAKERS STORE pour acheter et vendre vos téléphones en confiance.
        </p>

        {alert && (
          <Alert type={alert.type} className="mt-4">
            {alert.message}
          </Alert>
        )}

        <form onSubmit={handleSubmit} noValidate className="card mt-5 space-y-4 p-4 sm:p-6">
          <Field label="Nom complet" htmlFor="fullName" required error={errors.fullName}>
            <input
              id="fullName"
              name="fullName"
              type="text"
              autoComplete="name"
              className={`field ${errors.fullName ? 'field-error' : ''}`}
              placeholder="Ex. Jean Dossou"
              value={form.fullName}
              onChange={(e) => update('fullName', e.target.value)}
            />
          </Field>

          <Field label="Adresse e-mail" htmlFor="email" required error={errors.email}>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              className={`field ${errors.email ? 'field-error' : ''}`}
              placeholder="vous@exemple.com"
              value={form.email}
              onChange={(e) => update('email', e.target.value)}
            />
          </Field>

          <Field
            label="Numéro de téléphone"
            htmlFor="phone"
            required
            error={errors.phone}
            hint="Ex. 0197000000 ou +229 01 97 00 00 00"
          >
            <input
              id="phone"
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              className={`field ${errors.phone ? 'field-error' : ''}`}
              placeholder="0197000000"
              value={form.phone}
              onChange={(e) => update('phone', e.target.value)}
            />
          </Field>

          <Field label="Numéro WhatsApp" htmlFor="whatsapp" required error={errors.whatsapp}>
            <input
              id="whatsapp"
              name="whatsapp"
              type="tel"
              inputMode="tel"
              className={`field ${errors.whatsapp ? 'field-error' : ''}`}
              placeholder="0197000000"
              value={form.whatsapp}
              onChange={(e) => update('whatsapp', e.target.value)}
            />
          </Field>

          {/* Case à cocher : recopie automatiquement le téléphone */}
          <label
            htmlFor="sameAsPhone"
            className="flex cursor-pointer items-center gap-3 rounded-xl bg-slate-50 px-3 py-3"
          >
            <input
              id="sameAsPhone"
              type="checkbox"
              className="h-5 w-5 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              checked={sameAsPhone}
              onChange={(e) => toggleSameAsPhone(e.target.checked)}
            />
            <span className="text-sm text-slate-700">
              Le numéro WhatsApp est le même que le numéro de téléphone
            </span>
          </label>

          <Field label="Mot de passe" htmlFor="password" required error={errors.password}>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              className={`field ${errors.password ? 'field-error' : ''}`}
              placeholder="6 caractères minimum"
              value={form.password}
              onChange={(e) => update('password', e.target.value)}
            />
          </Field>

          <Field
            label="Confirmer le mot de passe"
            htmlFor="confirm"
            required
            error={errors.confirm}
          >
            <input
              id="confirm"
              name="confirm"
              type="password"
              autoComplete="new-password"
              className={`field ${errors.confirm ? 'field-error' : ''}`}
              placeholder="Retapez votre mot de passe"
              value={form.confirm}
              onChange={(e) => update('confirm', e.target.value)}
            />
          </Field>

          <button type="submit" className="btn-primary w-full" disabled={submitting}>
            {submitting ? (
              <>
                <Spinner /> Création du compte…
              </>
            ) : (
              'Créer mon compte'
            )}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-slate-500">
          Déjà un compte ?{' '}
          <Link to="/connexion" className="font-semibold text-brand-700 hover:underline">
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  )
}
