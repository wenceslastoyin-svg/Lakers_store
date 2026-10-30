// Mise en page générale : en-tête, menu mobile, pied de page, bouton WhatsApp flottant

import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { SITE_NAME } from '../lib/constants'
import { adminWhatsappLink } from '../lib/format'
import NotificationToggle from './NotificationToggle'
import {
  IconClose,
  IconHeart,
  IconMenu,
  IconUser,
  IconWhatsApp
} from './icons'

// Liens visibles par tout le monde
const PUBLIC_LINKS = [
  { to: '/', label: 'Accueil' },
  { to: '/catalogue', label: 'Catalogue' },
  { to: '/comment-ca-marche', label: 'Comment ça marche' },
  { to: '/contact', label: 'Contact' }
]

export default function Layout({ children }) {
  const { isAuthenticated, isAdmin, profile, signOut } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  // Ferme le menu mobile à chaque changement de page
  useEffect(() => {
    setMenuOpen(false)
    window.scrollTo({ top: 0 })
  }, [location.pathname])

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  const navLinkClass = ({ isActive }) =>
    `rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
      isActive ? 'text-brand-700' : 'text-slate-600 hover:text-brand-700'
    }`

  return (
    <div className="flex min-h-screen flex-col">
      {/* ------------------------------- En-tête ------------------------------ */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="container-app flex h-16 items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-600 text-lg font-black text-white">
              L
            </span>
            <span className="text-base font-extrabold tracking-tight text-slate-900">
              {SITE_NAME}
            </span>
          </Link>

          {/* Navigation bureau */}
          <nav className="hidden items-center gap-1 md:flex">
            {PUBLIC_LINKS.map((link) => (
              <NavLink key={link.to} to={link.to} className={navLinkClass} end={link.to === '/'}>
                {link.label}
              </NavLink>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Link
              to="/vendre"
              className="btn-primary btn-sm hidden sm:inline-flex"
              aria-label="Vendre un téléphone"
            >
              Vendre
            </Link>

            {isAuthenticated ? (
              <div className="hidden items-center gap-1 md:flex">
                <NavLink to="/favoris" className={navLinkClass} aria-label="Mes favoris">
                  <IconHeart className="h-5 w-5" />
                </NavLink>
                <NotificationToggle compact />
                <NavLink to="/mes-annonces" className={navLinkClass}>
                  Mes annonces
                </NavLink>
                <NavLink to="/mes-demandes" className={navLinkClass}>
                  Mes demandes
                </NavLink>
                {isAdmin && (
                  <NavLink to="/admin" className={navLinkClass}>
                    Admin
                  </NavLink>
                )}
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-500 hover:text-alert-600"
                >
                  Déconnexion
                </button>
              </div>
            ) : (
              <div className="hidden items-center gap-2 md:flex">
                <Link to="/connexion" className="btn-ghost btn-sm">
                  Connexion
                </Link>
              </div>
            )}

            {/* Bouton menu mobile */}
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 text-slate-700 md:hidden"
              aria-label="Ouvrir le menu"
              aria-expanded={menuOpen}
            >
              {menuOpen ? <IconClose /> : <IconMenu />}
            </button>
          </div>
        </div>

        {/* Menu mobile déroulant */}
        {menuOpen && (
          <div className="border-t border-slate-200 bg-white md:hidden">
            <div className="container-app flex flex-col gap-1 py-3">
              {PUBLIC_LINKS.map((link) => (
                <NavLink key={link.to} to={link.to} className={navLinkClass} end={link.to === '/'}>
                  {link.label}
                </NavLink>
              ))}
              <Link to="/vendre" className={navLinkClass}>
                Vendre un téléphone
              </Link>

              <div className="my-2 h-px bg-slate-200" />

              {isAuthenticated ? (
                <>
                  <div className="px-3 pb-2 text-sm text-slate-500">
                    Connecté·e en tant que{' '}
                    <span className="font-semibold text-slate-700">
                      {profile?.full_name || 'utilisateur'}
                    </span>
                  </div>
                  <NavLink to="/mes-annonces" className={navLinkClass}>
                    Mes annonces
                  </NavLink>
                  <NavLink to="/mes-demandes" className={navLinkClass}>
                    Mes demandes d’achat
                  </NavLink>
                  <NavLink to="/favoris" className={navLinkClass}>
                    Mes favoris
                  </NavLink>
                  <NotificationToggle className="mt-1 w-full justify-center" />
                  {isAdmin && (
                    <NavLink to="/admin" className={navLinkClass}>
                      Espace administrateur
                    </NavLink>
                  )}
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="rounded-lg px-3 py-2 text-left text-sm font-semibold text-alert-600"
                  >
                    Déconnexion
                  </button>
                </>
              ) : (
                <>
                  <NavLink to="/connexion" className={navLinkClass}>
                    Connexion
                  </NavLink>
                  <NavLink to="/inscription" className={navLinkClass}>
                    Créer un compte
                  </NavLink>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      {/* ------------------------------ Contenu ------------------------------- */}
      <main className="flex-1 pb-20">{children}</main>

      {/* ---------------------------- Pied de page ---------------------------- */}
      <Footer />

      {/* ------------------ Bouton WhatsApp flottant (bas droite) ------------- */}
      <a
        href={adminWhatsappLink('Bonjour LAKERS STORE, j’ai une question.')}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-5 right-4 z-40 flex h-14 w-14 items-center justify-center
                   rounded-full bg-[#25D366] text-white shadow-lg transition-transform
                   hover:scale-105 active:scale-95"
        aria-label="Contacter LAKERS STORE sur WhatsApp"
      >
        <IconWhatsApp className="h-7 w-7" />
      </a>
    </div>
  )
}

// Pied de page : liens utiles et informations légales
function Footer() {
  const year = new Date().getFullYear()
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="container-app grid gap-8 py-10 sm:grid-cols-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600 text-sm font-black text-white">
              L
            </span>
            <span className="font-extrabold text-slate-900">{SITE_NAME}</span>
          </div>
          <p className="mt-3 text-sm text-slate-500">
            Achetez et vendez des téléphones mobiles au Bénin en toute confiance. Prix en FCFA.
          </p>
        </div>

        <div>
          <h4 className="text-sm font-bold text-slate-900">Navigation</h4>
          <ul className="mt-3 space-y-2 text-sm text-slate-500">
            {PUBLIC_LINKS.map((link) => (
              <li key={link.to}>
                <Link to={link.to} className="hover:text-brand-700">
                  {link.label}
                </Link>
              </li>
            ))}
            <li>
              <Link to="/vendre" className="hover:text-brand-700">
                Vendre un téléphone
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-bold text-slate-900">Sécurité</h4>
          <p className="mt-3 rounded-xl bg-alert-500/10 px-3 py-2 text-sm font-medium text-alert-700">
            Ne payez jamais avant d’avoir vu le téléphone.
          </p>
          <p className="mt-3 flex items-center gap-2 text-sm text-slate-500">
            <IconUser className="h-4 w-4" />
            Assistance WhatsApp : {import.meta.env.VITE_ADMIN_WHATSAPP || '+22950813586'}
          </p>
        </div>
      </div>

      <div className="border-t border-slate-200 py-4">
        <p className="container-app text-center text-xs text-slate-400">
          © {year} {SITE_NAME} — Bénin. Tous droits réservés.
        </p>
      </div>
    </footer>
  )
}
