// Compression et envoi des photos d'annonces vers Supabase Storage

import imageCompression from 'browser-image-compression'
import { supabase, PHONES_BUCKET } from './supabase'
import { slugify } from './format'

// Compresse une image côté navigateur (léger et rapide sur mobile)
export async function compressImage(file) {
  return imageCompression(file, {
    maxSizeMB: 0.35, // ~350 Ko maximum par photo
    maxWidthOrHeight: 1280,
    useWebWorker: true,
    fileType: 'image/jpeg'
  })
}

// Envoie une liste de fichiers et renvoie leurs URL publiques.
// Les fichiers sont rangés dans le dossier de l'utilisateur : {userId}/{uuid}.jpg
export async function uploadPhoneImages(files, userId) {
  const urls = []

  for (let index = 0; index < files.length; index += 1) {
    const file = files[index]
    const compressed = await compressImage(file)
    const path = `${userId}/${crypto.randomUUID()}-${slugify(file.name) || 'photo'}.jpg`

    const { error } = await supabase.storage
      .from(PHONES_BUCKET)
      .upload(path, compressed, { contentType: 'image/jpeg', upsert: false })

    if (error) throw new Error(`Envoi de la photo ${index + 1} impossible : ${error.message}`)

    const { data } = supabase.storage.from(PHONES_BUCKET).getPublicUrl(path)
    urls.push(data.publicUrl)
  }

  return urls
}

// Supprime des photos du stockage à partir de leurs URL publiques
export async function deletePhoneImages(urls = []) {
  const paths = urls
    .map((url) => {
      const marker = `/object/public/${PHONES_BUCKET}/`
      const index = url.indexOf(marker)
      return index === -1 ? null : decodeURIComponent(url.slice(index + marker.length))
    })
    .filter(Boolean)

  if (paths.length === 0) return
  await supabase.storage.from(PHONES_BUCKET).remove(paths)
}

// Vérifie une photo avant envoi : type et taille
export function validateImageFile(file) {
  if (!file.type.startsWith('image/')) {
    return 'Seules les images sont acceptées (JPG, PNG).'
  }
  if (file.size > 8 * 1024 * 1024) {
    return 'Chaque photo doit faire moins de 8 Mo.'
  }
  return null
}
