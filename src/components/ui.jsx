// Petits composants d'interface réutilisables (boutons, champs, badges, messages)

import { IconAlert, IconCheck, IconShield } from './icons'

// --- Champ de formulaire avec libellé et message d'erreur -------------------
export function Field({ label, htmlFor, error, hint, required, children }) {
  return (
    <div>
      {label && (
        <label className="label" htmlFor={htmlFor}>
          {label}
          {required && <span className="text-alert-600"> *</span>}
        </label>
      )}
      {children}
      {hint && !error && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
      {error && <p className="mt-1 text-xs font-medium text-alert-600">{error}</p>}
    </div>
  )
}

// --- Indicateur de chargement -----------------------------------------------
export function Spinner({ className = 'h-5 w-5' }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

// Écran de chargement pleine page
export function PageLoader({ label = 'Chargement…' }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-20 text-slate-500">
      <Spinner className="h-8 w-8 text-brand-600" />
      <p className="text-sm">{label}</p>
    </div>
  )
}

// --- Message d'information / succès / erreur --------------------------------
export function Alert({ type = 'info', children, className = '' }) {
  const styles = {
    info: 'bg-slate-100 text-slate-700',
    success: 'bg-brand-50 text-brand-800',
    error: 'bg-alert-500/10 text-alert-700',
    warning: 'bg-sun-400/15 text-sun-600'
  }
  const Icon = type === 'error' || type === 'warning' ? IconAlert : IconCheck

  return (
    <div
      role="status"
      className={`flex items-start gap-2 rounded-xl px-4 py-3 text-sm ${styles[type]} ${className}`}
    >
      <Icon className="mt-0.5 h-5 w-5 shrink-0" />
      <div className="flex-1">{children}</div>
    </div>
  )
}

// --- Badge de statut coloré --------------------------------------------------
export function StatusBadge({ config, className = '' }) {
  if (!config) return null
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${config.className} ${className}`}
    >
      {config.label}
    </span>
  )
}

// --- Badge « Vendeur vérifié » ----------------------------------------------
export function VerifiedBadge({ showLabel = true, className = '' }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-700 ${className}`}
      title="Vendeur vérifié par LAKERS STORE"
    >
      <IconShield className="h-3.5 w-3.5" />
      {showLabel && 'Vendeur vérifié'}
    </span>
  )
}

// --- Squelettes de chargement ------------------------------------------------
// Bloc gris animé affiché à la place du contenu pendant le chargement
export function Skeleton({ className = '' }) {
  return (
    <div className={`relative overflow-hidden rounded-xl bg-slate-200/70 ${className}`}>
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/60 to-transparent" />
    </div>
  )
}

// Squelette d'une carte produit (même forme que PhoneCard)
export function PhoneCardSkeleton() {
  return (
    <div className="card overflow-hidden">
      <Skeleton className="aspect-square w-full rounded-none" />
      <div className="space-y-2 p-3">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-5 w-1/2" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    </div>
  )
}

// Grille de squelettes (reprend la grille du catalogue)
export function PhoneGridSkeleton({
  count = 8,
  className = 'grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4'
}) {
  return (
    <div className={className}>
      {Array.from({ length: count }).map((_, index) => (
        <PhoneCardSkeleton key={index} />
      ))}
    </div>
  )
}

// --- État vide ---------------------------------------------------------------
export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
      {Icon && <Icon className="h-10 w-10 text-slate-300" />}
      <h3 className="text-base font-semibold text-slate-800">{title}</h3>
      {description && <p className="max-w-md text-sm text-slate-500">{description}</p>}
      {action}
    </div>
  )
}
