// Page « Vendre » : création ET modification d'une annonce de téléphone.
// Le paramètre d'URL ?modifier=<uuid> active le mode modification.

import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  BRANDS,
  CITIES,
  CONDITIONS,
  MAX_PHOTOS,
  MIN_PHOTOS,
  RAM_OPTIONS,
  STORAGE_OPTIONS
} from '../lib/constants'
import { formatPrice } from '../lib/format'
import { uploadPhoneImages, validateImageFile } from '../lib/image'
import { createPhone, fetchPhoneById, replacePhoneImages, updatePhone } from '../lib/api'
import { Alert, Field, PageLoader, Spinner } from '../components/ui'
import { IconCamera, IconClose } from '../components/icons'
import ScamWarning from '../components/ScamWarning'

// Valeurs initiales du formulaire
const EMPTY_FORM = {
  brand: '',
  model: '',
  condition: 'bon_etat',
  storage: '',
  ram: '',
  color: '',
  accessories: '',
  issues: '',
  city: '',
  description: '',
  price: ''
}

export default function Sell() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const editId = searchParams.get('modifier')
  const isEdit = Boolean(editId)

  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const [alert, setAlert] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [uploading, setUploading] = useState(false)

  // Photos déjà enregistrées (mode modification) : on garde leurs URL
  const [existingImages, setExistingImages] = useState([])
  // Nouvelles photos choisies : { file, preview }
  const [newPhotos, setNewPhotos] = useState([])

  const [loadingPhone, setLoadingPhone] = useState(isEdit)
  const fileInputRef = useRef(null)
  const previewsRef = useRef([])

  // --- Pré-remplissage en mode modification --------------------------------
  useEffect(() => {
    if (!editId) return undefined
    let active = true
    setLoadingPhone(true)

    fetchPhoneById(editId)
      .then((phone) => {
        if (!active || !phone) return
        setForm({
          brand: phone.brand ?? '',
          model: phone.model ?? '',
          condition: phone.condition ?? 'bon_etat',
          storage: phone.storage ?? '',
          ram: phone.ram ?? '',
          color: phone.color ?? '',
          accessories: phone.accessories ?? '',
          issues: phone.issues ?? '',
          city: phone.city ?? '',
          description: phone.description ?? '',
          price: phone.price ? String(phone.price) : ''
        })
        setExistingImages(phone.images ?? [])
      })
      .catch((err) => {
        if (active) setAlert({ type: 'error', message: err.message || 'Chargement impossible.' })
      })
      .finally(() => {
        if (active) setLoadingPhone(false)
      })

    return () => {
      active = false
    }
  }, [editId])

  // Mémorise les aperçus pour pouvoir les libérer au démontage
  useEffect(() => {
    previewsRef.current = newPhotos.map((photo) => photo.preview)
  }, [newPhotos])

  // Libère tous les aperçus (URL.createObjectURL) au démontage
  useEffect(() => {
    return () => {
      previewsRef.current.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [])

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }))

  const totalPhotos = existingImages.length + newPhotos.length

  // --- Gestion des photos ---------------------------------------------------
  const handleFilesChange = (event) => {
    const files = Array.from(event.target.files ?? [])
    event.target.value = '' // permet de resélectionner les mêmes fichiers
    if (files.length === 0) return

    const photoErrors = []
    const accepted = []

    for (const file of files) {
      const messageErreur = validateImageFile(file)
      if (messageErreur) {
        photoErrors.push(`${file.name} : ${messageErreur}`)
        continue
      }
      if (totalPhotos + accepted.length >= MAX_PHOTOS) {
        photoErrors.push(`Maximum ${MAX_PHOTOS} photos par annonce.`)
        break
      }
      accepted.push({ file, preview: URL.createObjectURL(file) })
    }

    if (accepted.length > 0) setNewPhotos((prev) => [...prev, ...accepted])

    setErrors((prev) => ({ ...prev, photos: photoErrors.join(' ') || undefined }))
  }

  const removeExistingImage = (url) => {
    setExistingImages((prev) => prev.filter((item) => item !== url))
  }

  const removeNewPhoto = (index) => {
    setNewPhotos((prev) => {
      const removed = prev[index]
      if (removed) URL.revokeObjectURL(removed.preview)
      return prev.filter((_, i) => i !== index)
    })
  }

  // --- Validation -----------------------------------------------------------
  const validate = () => {
    const next = {}
    if (!form.brand) next.brand = 'Choisissez la marque.'
    if (!form.model.trim()) next.model = 'Indiquez le modèle.'
    if (!form.storage) next.storage = 'Choisissez le stockage.'
    if (!form.ram) next.ram = 'Choisissez la mémoire vive.'
    if (!form.city) next.city = 'Choisissez la ville.'
    if (form.description.trim().length < 20)
      next.description = 'La description doit contenir au moins 20 caractères.'
    const priceValue = Number(form.price)
    if (!form.price || !Number.isInteger(priceValue) || priceValue <= 0)
      next.price = 'Indiquez un prix valide en FCFA (nombre entier positif).'
    if (totalPhotos < MIN_PHOTOS)
      next.photos = `Ajoutez au moins ${MIN_PHOTOS} photos (${totalPhotos} actuellement).`
    return next
  }

  // --- Soumission -----------------------------------------------------------
  const handleSubmit = async (event) => {
    event.preventDefault()
    const nextErrors = validate()
    setErrors(nextErrors)
    setAlert(null)
    if (Object.keys(nextErrors).length > 0) {
      setAlert({ type: 'error', message: 'Veuillez corriger les champs indiqués en rouge.' })
      return
    }

    setSubmitting(true)
    try {
      // 1) Envoi des NOUVELLES photos uniquement
      let uploadedUrls = []
      if (newPhotos.length > 0) {
        setUploading(true)
        uploadedUrls = await uploadPhoneImages(
          newPhotos.map((p) => p.file),
          user.id
        )
        setUploading(false)
      }

      // 2) Données de l'annonce (sans seller_id : utilisé seulement à la création)
      const payload = {
        brand: form.brand,
        model: form.model.trim(),
        condition: form.condition,
        storage: form.storage,
        ram: form.ram,
        color: form.color.trim(),
        accessories: form.accessories.trim(),
        issues: form.issues.trim(),
        city: form.city,
        description: form.description.trim(),
        price: Number(form.price)
      }

      if (isEdit) {
        // Modification : mise à jour puis remplacement des photos
        await updatePhone(editId, payload)
        // Ordre final : photos existantes conservées, puis nouvelles
        await replacePhoneImages(editId, [...existingImages, ...uploadedUrls])
      } else {
        // Création
        await createPhone({ seller_id: user.id, ...payload }, uploadedUrls)
      }

      setAlert({
        type: 'success',
        message:
          'Votre annonce est enregistrée et EN ATTENTE DE VALIDATION par l’administrateur. Elle sera publiée après validation.'
      })
      window.setTimeout(() => navigate('/mes-annonces'), 2000)
    } catch (err) {
      setUploading(false)
      setAlert({ type: 'error', message: err.message || 'Enregistrement impossible pour le moment.' })
    } finally {
      setSubmitting(false)
    }
  }

  const prixAffiche = Number(form.price) > 0 ? formatPrice(Number(form.price)) : null
  const canAddMore = totalPhotos < MAX_PHOTOS

  if (loadingPhone) return <PageLoader label="Chargement de l’annonce…" />

  return (
    <div className="container-app py-8">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-extrabold text-slate-900">
          {isEdit ? 'Modifier l’annonce' : 'Publier un téléphone'}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Votre annonce sera vérifiée par l’administrateur avant publication.
        </p>

        {alert && (
          <Alert type={alert.type} className="mt-4">
            {alert.message}
          </Alert>
        )}

        {/* Indicateur d'envoi des photos */}
        {uploading && (
          <div className="mt-4 flex items-center gap-3 rounded-xl bg-brand-50 px-4 py-3 text-sm text-brand-800">
            <Spinner className="h-5 w-5 text-brand-600" />
            Envoi des photos…
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="card mt-5 space-y-4 p-4 sm:p-6">
          <Field label="Marque" htmlFor="brand" required error={errors.brand}>
            <select
              id="brand"
              name="brand"
              className={`field ${errors.brand ? 'field-error' : ''}`}
              value={form.brand}
              onChange={(e) => update('brand', e.target.value)}
            >
              <option value="">— Choisir une marque —</option>
              {BRANDS.map((brand) => (
                <option key={brand} value={brand}>
                  {brand}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Modèle" htmlFor="model" required error={errors.model}>
            <input
              id="model"
              name="model"
              type="text"
              className={`field ${errors.model ? 'field-error' : ''}`}
              placeholder="Ex. iPhone 13 Pro, Galaxy A54…"
              value={form.model}
              onChange={(e) => update('model', e.target.value)}
            />
          </Field>

          <Field label="État" htmlFor="condition" required error={errors.condition}>
            <select
              id="condition"
              name="condition"
              className={`field ${errors.condition ? 'field-error' : ''}`}
              value={form.condition}
              onChange={(e) => update('condition', e.target.value)}
            >
              {CONDITIONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Stockage" htmlFor="storage" required error={errors.storage}>
              <select
                id="storage"
                name="storage"
                className={`field ${errors.storage ? 'field-error' : ''}`}
                value={form.storage}
                onChange={(e) => update('storage', e.target.value)}
              >
                <option value="">— Choisir —</option>
                {STORAGE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Mémoire vive (RAM)" htmlFor="ram" required error={errors.ram}>
              <select
                id="ram"
                name="ram"
                className={`field ${errors.ram ? 'field-error' : ''}`}
                value={form.ram}
                onChange={(e) => update('ram', e.target.value)}
              >
                <option value="">— Choisir —</option>
                {RAM_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Couleur" htmlFor="color" error={errors.color}>
            <input
              id="color"
              name="color"
              type="text"
              className={`field ${errors.color ? 'field-error' : ''}`}
              placeholder="Ex. Noir, Bleu, Or…"
              value={form.color}
              onChange={(e) => update('color', e.target.value)}
            />
          </Field>

          <Field
            label="Accessoires inclus"
            htmlFor="accessories"
            error={errors.accessories}
            hint="Ex. chargeur, câble, écouteurs, boîte d’origine…"
          >
            <input
              id="accessories"
              name="accessories"
              type="text"
              className={`field ${errors.accessories ? 'field-error' : ''}`}
              placeholder="Ex. Chargeur et câble"
              value={form.accessories}
              onChange={(e) => update('accessories', e.target.value)}
            />
          </Field>

          <Field
            label="Problèmes éventuels"
            htmlFor="issues"
            error={errors.issues}
            hint="Optionnel : signalez toute rayure, panne ou défaut."
          >
            <textarea
              id="issues"
              name="issues"
              rows={2}
              className={`field ${errors.issues ? 'field-error' : ''}`}
              placeholder="Ex. Légère rayure sur l’écran"
              value={form.issues}
              onChange={(e) => update('issues', e.target.value)}
            />
          </Field>

          <Field label="Ville" htmlFor="city" required error={errors.city}>
            <select
              id="city"
              name="city"
              className={`field ${errors.city ? 'field-error' : ''}`}
              value={form.city}
              onChange={(e) => update('city', e.target.value)}
            >
              <option value="">— Choisir une ville —</option>
              {CITIES.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Description" htmlFor="description" required error={errors.description}>
            <textarea
              id="description"
              name="description"
              rows={4}
              className={`field ${errors.description ? 'field-error' : ''}`}
              placeholder="Décrivez le téléphone : état, historique, garantie… (20 caractères minimum)"
              value={form.description}
              onChange={(e) => update('description', e.target.value)}
            />
          </Field>

          <Field label="Prix (FCFA)" htmlFor="price" required error={errors.price}>
            <input
              id="price"
              name="price"
              type="number"
              inputMode="numeric"
              min="0"
              step="1"
              className={`field ${errors.price ? 'field-error' : ''}`}
              placeholder="Ex. 125000"
              value={form.price}
              onChange={(e) => update('price', e.target.value)}
            />
            {prixAffiche && <p className="mt-1 text-sm font-semibold text-brand-700">{prixAffiche}</p>}
          </Field>

          {/* --- Photos ----------------------------------------------------- */}
          <Field
            label={`Photos (${totalPhotos}/${MAX_PHOTOS})`}
            required
            error={errors.photos}
            hint={`Ajoutez ${MIN_PHOTOS} à ${MAX_PHOTOS} photos claires du téléphone.`}
          >
            <input
              ref={fileInputRef}
              id="photos"
              name="photos"
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFilesChange}
            />

            {totalPhotos > 0 && (
              <div className="mb-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
                {/* Photos existantes (mode modification) */}
                {existingImages.map((url) => (
                  <div key={url} className="relative overflow-hidden rounded-xl border border-slate-200">
                    <img src={url} alt="Photo de l’annonce" className="aspect-square w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeExistingImage(url)}
                      className="absolute right-1 top-1 grid h-7 w-7 place-items-center rounded-full bg-black/60 text-white"
                      aria-label="Retirer cette photo"
                    >
                      <IconClose className="h-4 w-4" />
                    </button>
                  </div>
                ))}

                {/* Nouvelles photos */}
                {newPhotos.map((photo, index) => (
                  <div
                    key={photo.preview}
                    className="relative overflow-hidden rounded-xl border border-slate-200"
                  >
                    <img src={photo.preview} alt="Nouvelle photo" className="aspect-square w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeNewPhoto(index)}
                      className="absolute right-1 top-1 grid h-7 w-7 place-items-center rounded-full bg-black/60 text-white"
                      aria-label="Retirer cette photo"
                    >
                      <IconClose className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={!canAddMore}
              className="btn-secondary w-full disabled:opacity-50"
            >
              <IconCamera className="h-5 w-5" />
              {canAddMore ? 'Ajouter des photos' : `Limite de ${MAX_PHOTOS} photos atteinte`}
            </button>
          </Field>

          <button type="submit" className="btn-primary w-full" disabled={submitting}>
            {submitting ? (
              <>
                <Spinner /> {uploading ? 'Envoi des photos…' : 'Enregistrement…'}
              </>
            ) : isEdit ? (
              'Enregistrer les modifications'
            ) : (
              'Publier mon annonce'
            )}
          </button>
        </form>

        <div className="mt-6">
          <ScamWarning />
        </div>
      </div>
    </div>
  )
}
