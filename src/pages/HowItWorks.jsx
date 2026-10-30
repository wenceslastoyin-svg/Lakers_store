// Page « Comment ça marche » : étapes, informations acheteurs, sécurité et FAQ

import { Link } from 'react-router-dom'
import ScamWarning from '../components/ScamWarning'
import { SITE_NAME } from '../lib/constants'

// Étapes principales, dans l'ordre
const STEPS = [
  {
    title: 'Créez un compte gratuit',
    text: 'En quelques secondes, avec votre nom, votre e-mail et votre numéro WhatsApp. Aucun frais d’inscription.'
  },
  {
    title: 'Publiez votre annonce',
    text: 'Ajoutez 3 à 6 photos nettes, décrivez l’état du téléphone et indiquez un prix en FCFA.'
  },
  {
    title: 'L’annonce est vérifiée',
    text: 'L’administrateur contrôle chaque annonce avant sa publication, pour limiter les arnaques.'
  },
  {
    title: 'L’acheteur vous contacte',
    text: 'Les personnes intéressées vous écrivent directement sur WhatsApp pour poser leurs questions.'
  },
  {
    title: 'Concluez la vente en main propre',
    text: 'Rencontrez l’acheteur dans un lieu public, faites-lui tester le téléphone, puis encaissez le paiement.'
  }
]

// Questions fréquentes affichées dans des <details> natifs (léger et accessible)
const FAQ = [
  {
    q: 'Est-ce que publier une annonce est payant ?',
    a: 'Non. Créer un compte et publier une annonce sur ' + SITE_NAME + ' est entièrement gratuit.'
  },
  {
    q: 'Pourquoi mon annonce attend une validation ?',
    a: 'Chaque annonce est relue par l’administrateur pour vérifier les photos et les informations. Une fois validée, elle apparaît dans le catalogue.'
  },
  {
    q: 'Comment fixer le bon prix ?',
    a: 'Regardez des téléphones similaires dans le catalogue, tenez compte de l’état, du stockage et de la marque, puis indiquez un prix réaliste en FCFA.'
  },
  {
    q: 'Comment ajouter un téléphone à mes favoris ?',
    a: 'Touchez le cœur sur une annonce. Vous le retrouverez dans « Mes favoris » après vous être connecté.'
  },
  {
    q: 'Puis-je être livré ou payer en ligne ?',
    a: 'La vente se conclut en main propre pour votre sécurité. Ne payez jamais avant d’avoir vu le téléphone.'
  }
]

export default function HowItWorks() {
  return (
    <div className="container-app space-y-10 py-6">
      {/* ------------------------------- En-tête ---------------------------- */}
      <header className="rounded-3xl bg-gradient-to-b from-brand-50 to-white px-5 py-8 sm:px-8">
        <h1 className="text-2xl font-black text-slate-900 sm:text-3xl">Comment ça marche ?</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600 sm:text-base">
          Acheter ou vendre un téléphone sur {SITE_NAME} est simple, rapide et sécurisé. Voici les
          étapes, de la publication à la vente.
        </p>
      </header>

      {/* -------------------------- Étapes numérotées ----------------------- */}
      <section className="space-y-3">
        <h2 className="text-lg font-bold text-slate-900">Vendre un téléphone, étape par étape</h2>
        <ol className="space-y-3">
          {STEPS.map((step, index) => (
            <li key={step.title} className="card flex gap-4 p-4">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-600 text-sm font-bold text-white">
                {index + 1}
              </span>
              <div>
                <h3 className="text-sm font-bold text-slate-900">{step.title}</h3>
                <p className="mt-1 text-sm text-slate-500">{step.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* ---------------------------- Coté acheteurs ------------------------ */}
      <section className="card space-y-3 p-5">
        <h2 className="text-lg font-bold text-slate-900">Pour les acheteurs</h2>
        <ul className="space-y-2 text-sm text-slate-600">
          <li>
            • Utilisez les <span className="font-semibold text-slate-800">filtres</span> du
            catalogue (marque, prix, état, stockage, ville) pour trouver le bon téléphone.
          </li>
          <li>
            • Enregistrez vos coups de cœur dans vos{' '}
            <span className="font-semibold text-slate-800">favoris</span> pour les comparer plus
            tard.
          </li>
          <li>
            • Touchez le bouton <span className="font-semibold text-slate-800">« Je veux l’acheter »</span>{' '}
            sur une annonce pour contacter le vendeur directement sur WhatsApp.
          </li>
        </ul>
      </section>

      {/* --------------------------- Avertissement -------------------------- */}
      <ScamWarning />

      {/* -------------------------------- FAQ ------------------------------ */}
      <section className="space-y-3">
        <h2 className="text-lg font-bold text-slate-900">Questions fréquentes</h2>
        <div className="space-y-2">
          {FAQ.map((item) => (
            <details key={item.q} className="card p-4">
              <summary className="cursor-pointer text-sm font-bold text-slate-900">
                {item.q}
              </summary>
              <p className="mt-2 text-sm text-slate-500">{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ---------------------------- Appels à l'action --------------------- */}
      <section className="grid gap-3 sm:grid-cols-2">
        <Link to="/vendre" className="btn-primary">
          Vendre un téléphone
        </Link>
        <Link to="/catalogue" className="btn-secondary">
          Parcourir le catalogue
        </Link>
      </section>
    </div>
  )
}
