// Client Supabase partagé par toute l'application
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Avertissement utile en développement si le .env n'est pas encore rempli
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '[LAKERS STORE] Supabase non configuré : copie .env.example en .env et renseigne ' +
      'VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY.'
  )
}

export const supabase = createClient(supabaseUrl ?? '', supabaseAnonKey ?? '', {
  auth: {
    persistSession: true,
    autoRefreshToken: true
  }
})

// Nom du bucket de stockage des photos d'annonces
export const PHONES_BUCKET = 'phones'
