// Page « Mes annonces » : liste des téléphones publiés par l'utilisateur connecté

import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { PHONE_STATUS } from '../lib/constants'
import { formatPrice } from '../lib/format'
import { deletePhone, fetchMyPhones, markPhoneAsSold } from '../lib/api'
import { deletePhoneImages } from '../lib/image'
import { Alert, EmptyState, PageLoader, StatusBadge } from '../components/ui'
import { IconCamera, IconCart, IconEdit, IconTrash } from '../components/icons'

export default function MyListings() {
  const { user } = useAuth()

  const [phones, setPhones] = useState([])
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

  // Chargement (réutilisé après chaque action)
  const load = useCallback(async () => {
    if (!user?.id) return
    setLoading(true)
    try {
      const data = await fetchMyPhones(user.id)
      setPhones(data)
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

  // Marque une annonce comme vendue
  const handleSold = async (phone) => {
    setBusyId(phone.id)
    try {
      await markPhoneAsSold(phone.id)
      await load()
      flash('success', 'Votre annonce a été marquée comme vendue.')
    } catch (err) {
      flash('error', err.message || 'Action impossible.')
    } finally {
      setBusyId(null)
    }
  }

  // Supprime une annonce + ses photos du stockage
  const handleDelete = async (phone) => {
    const confirme = window.confirm(
      'Voulez-vous vraiment supprimer cette annonce ? Cette action est définitive.'
    )
    if (!confirme) return

    setBusyId(phone.id)
    try {
      await deletePhone(phone.id)
      // Supprime aussi les fichiers du stockage (n'échoue pas l'action si absent)
      await deletePhoneImages(phone.images ?? [])
      await load()
      flash('success', 'L’annonce a été supprimée.')
    } catch (err) {
      flash('error', err.message || 'Suppression impossible.')
    } finally {
      setBusyId(null)
    }
  }

  if (loading) return <PageLoader label="Chargement de vos annonces…" />

  return (
    <div className="container-app py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Mes annonces</h1>
          <p className="mt-1 text-sm text-slate-500">
            Gérez les téléphones que vous avez mis en vente.
          </p>
        </div>
        <Link to="/vendre" className="btn-primary btn-sm">
          Publier un téléphone
        </Link>
      </div>

      {alert && (
        <Alert type={alert.type} className="mt-4">
          {alert.message}
        </Alert>
      )}

      {phones.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            icon={IconCart}
            title="Aucune annonce"
            description="Vous n'avez pas encore publié de téléphone."
            action={
              <Link to="/vendre" className="btn-primary mt-1">
                Publier un téléphone
              </Link>
            }
          />
        </div>
      ) : (
        <ul className="mt-6 space-y-4">
          {phones.map((phone) => {
            const cover = phone.images?.[0]
            const isValidee = phone.status === 'validee'
            const isVendue = phone.status === 'vendue'
            const busy = busyId === phone.id

            return (
              <li key={phone.id} className="card overflow-hidden">
                <div className="flex flex-col gap-4 p-4 sm:flex-row">
                  {/* Photo */}
                  <Link
                    to={isValidee || isVendue ? `/telephone/${phone.id}` : '#'}
                    className="block w-full shrink-0 sm:w-32"
                  >
                    <div className="aspect-square w-full overflow-hidden rounded-xl bg-slate-100 sm:w-32">
                      {cover ? (
                        <img
                          src={cover}
                          alt={`${phone.brand} ${phone.model}`}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="grid h-full w-full place-items-center text-slate-300">
                          <IconCamera className="h-8 w-8" />
                        </div>
                      )}
                    </div>
                  </Link>

                  {/* Infos + actions */}
                  <div className="flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <h2 className="text-base font-bold text-slate-900">
                          {phone.brand} {phone.model}
                        </h2>
                        <p className="text-lg font-extrabold text-brand-700">
                          {formatPrice(phone.price)}
                        </p>
                      </div>
                      <StatusBadge config={PHONE_STATUS[phone.status]} />
                    </div>

                    {/* Message selon le statut */}
                    {phone.status === 'en_attente' && (
                      <p className="mt-2 rounded-lg bg-sun-400/15 px-3 py-2 text-sm text-sun-600">
                        En attente de validation
                      </p>
                    )}
                    {phone.status === 'refusee' && (
                      <p className="mt-2 rounded-lg bg-alert-500/10 px-3 py-2 text-sm text-alert-700">
                        L’administrateur a refusé cette annonce. Vous pouvez la modifier puis la
                        republier.
                      </p>
                    )}
                    {phone.status === 'validee' && (
                      <p className="mt-2 rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-700">
                        Votre annonce est en ligne.
                      </p>
                    )}

                    {/* Boutons d'action */}
                    <div className="mt-3 flex flex-wrap gap-2">
                      {!isVendue && (
                        <Link to={`/vendre?modifier=${phone.id}`} className="btn-ghost btn-sm">
                          <IconEdit className="h-4 w-4" />
                          Modifier
                        </Link>
                      )}

                      {isValidee && (
                        <button
                          type="button"
                          onClick={() => handleSold(phone)}
                          disabled={busy}
                          className="btn-sun btn-sm"
                        >
                          Marquer comme vendu
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleDelete(phone)}
                        disabled={busy}
                        className="btn-danger btn-sm"
                      >
                        <IconTrash className="h-4 w-4" />
                        Supprimer
                      </button>

                      {(isValidee || isVendue) && (
                        <Link to={`/telephone/${phone.id}`} className="btn-secondary btn-sm">
                          Voir l’annonce
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
