// Page de connexion : e-mail + mot de passe, avec mot de passe oublié

import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { Alert, Field, Spinner } from '../components/ui'

export default function Login() {
  const { signIn, isAuthenticated, loading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // Page demandée avant la redirection vers la connexion (sinon accueil)
  const redirectTo = location.state?.from || '/'

  const [form, setForm] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [alert, setAlert] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [resetting, setResetting] = useState(false)

  // Déjà connecté → retour immédiat
  useEffect(() => {
    if (!loading && isAuthenticated) navigate(redirectTo, { replace: true })
  }, [loading, isAuthenticated, navigate, redirectTo])

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }))

  // Validation simple du formulaire de connexion
  const validate = (values) => {
    const next = {}
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) next.email = 'Adresse e-mail invalide.'
    if (values.password.length < 6) next.password = 'Le mot de passe doit contenir au moins 6 caractères.'
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
      await signIn({ email: form.email.trim(), password: form.password })
      navigate(redirectTo, { replace: true })
    } catch (err) {
      setAlert({ type: 'error', message: err.message || 'Connexion impossible pour le moment.' })
    } finally {
      setSubmitting(false)
    }
  }

  // Envoie un e-mail de réinitialisation du mot de passe
  const handleForgotPassword = async () => {
    setAlert(null)
    let email = form.email.trim()
    // Si l'e-mail n'est pas encore saisi, on le demande
    if (!email) {
      email = window.prompt('Entrez l’adresse e-mail de votre compte :') || ''
      email = email.trim()
    }
    if (!email) return

    setResetting(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email)
      if (error) throw error
      setAlert({
        type: 'success',
        message: 'Si un compte existe avec cet e-mail, un lien de réinitialisation vient d’être envoyé. Consultez votre boîte de réception.'
      })
    } catch (err) {
      setAlert({ type: 'error', message: err.message || 'Envoi impossible pour le moment.' })
    } finally {
      setResetting(false)
    }
  }

  return (
    <div className="container-app py-8">
      <div className="mx-auto max-w-md">
        <h1 className="text-2xl font-extrabold text-slate-900">Connexion</h1>
        <p className="mt-1 text-sm text-slate-500">Content de vous revoir sur LAKERS STORE.</p>

        {alert && (
          <Alert type={alert.type} className="mt-4">
            {alert.message}
          </Alert>
        )}

        <form onSubmit={handleSubmit} noValidate className="card mt-5 space-y-4 p-4 sm:p-6">
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

          <Field label="Mot de passe" htmlFor="password" required error={errors.password}>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              className={`field ${errors.password ? 'field-error' : ''}`}
              placeholder="Votre mot de passe"
              value={form.password}
              onChange={(e) => update('password', e.target.value)}
            />
          </Field>

          <button type="submit" className="btn-primary w-full" disabled={submitting}>
            {submitting ? (
              <>
                <Spinner /> Connexion…
              </>
            ) : (
              'Se connecter'
            )}
          </button>

          <div className="text-center">
            <button
              type="button"
              onClick={handleForgotPassword}
              disabled={resetting}
              className="text-sm font-semibold text-brand-700 hover:underline disabled:opacity-50"
            >
              {resetting ? 'Envoi en cours…' : 'Mot de passe oublié ?'}
            </button>
          </div>
        </form>

        <p className="mt-4 text-center text-sm text-slate-500">
          Pas encore de compte ?{' '}
          <Link to="/inscription" className="font-semibold text-brand-700 hover:underline">
            Créer un compte
          </Link>
        </p>
      </div>
    </div>
  )
}
