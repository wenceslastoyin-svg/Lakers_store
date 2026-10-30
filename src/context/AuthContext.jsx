// Contexte d'authentification : session Supabase + profil applicatif

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  // Charge le profil applicatif (table profiles) de l'utilisateur connecté
  const loadProfile = useCallback(async (userId) => {
    if (!userId) {
      setProfile(null)
      return null
    }
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()

    if (error) {
      console.error('Chargement du profil impossible :', error.message)
      setProfile(null)
      return null
    }
    setProfile(data)
    return data
  }, [])

  // Au démarrage : récupère la session existante puis écoute les changements
  useEffect(() => {
    let active = true

    supabase.auth.getSession().then(async ({ data: { session: current } }) => {
      if (!active) return
      setSession(current)
      await loadProfile(current?.user?.id)
      setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      setSession(nextSession)
      await loadProfile(nextSession?.user?.id)
    })

    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [loadProfile])

  // Inscription : crée le compte puis complète le profil (nom, téléphone, WhatsApp)
  const signUp = useCallback(async ({ fullName, email, phone, whatsapp, password }) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          phone,
          whatsapp
        }
      }
    })
    if (error) throw new Error(traduireErreurAuth(error.message))

    // Le trigger SQL crée la ligne « profiles ». On la relit tout de suite.
    if (data?.user) await loadProfile(data.user.id)
    return data
  }, [loadProfile])

  const signIn = useCallback(async ({ email, password }) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw new Error(traduireErreurAuth(error.message))
    await loadProfile(data.user?.id)
    return data
  }, [loadProfile])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    setSession(null)
    setProfile(null)
  }, [])

  // Met à jour les informations du profil
  const updateProfile = useCallback(async (updates) => {
    if (!session?.user?.id) throw new Error('Vous devez être connecté.')
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', session.user.id)
      .select()
      .single()
    if (error) throw error
    setProfile(data)
    return data
  }, [session])

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      loading,
      isAuthenticated: Boolean(session?.user),
      isAdmin: Boolean(profile?.is_admin),
      isBlocked: Boolean(profile?.is_blocked),
      signUp,
      signIn,
      signOut,
      updateProfile,
      refreshProfile: () => loadProfile(session?.user?.id)
    }),
    [session, profile, loading, signUp, signIn, signOut, updateProfile, loadProfile]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// Traduit les messages d'erreur Supabase les plus fréquents en français
function traduireErreurAuth(message = '') {
  const m = message.toLowerCase()
  if (m.includes('invalid login credentials')) return 'E-mail ou mot de passe incorrect.'
  if (m.includes('email not confirmed')) return 'Confirmez d’abord votre e-mail avant de vous connecter.'
  if (m.includes('user already registered')) return 'Un compte existe déjà avec cet e-mail.'
  if (m.includes('password should be at least')) return 'Le mot de passe doit contenir au moins 6 caractères.'
  if (m.includes('unable to validate email')) return 'Adresse e-mail invalide.'
  if (m.includes('email rate limit')) return 'Trop de tentatives, réessayez dans quelques minutes.'
  return message
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth doit être utilisé à l’intérieur de AuthProvider.')
  return context
}
