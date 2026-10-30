// Page contact : coordonnées de l'administrateur et accès direct à WhatsApp

import { Link } from 'react-router-dom'
import { Alert } from '../components/ui'
import { IconMail, IconMapPin, IconWhatsApp } from '../components/icons'
import { ADMIN_EMAIL, ADMIN_WHATSAPP, SITE_NAME } from '../lib/constants'
import { adminWhatsappLink } from '../lib/format'

export default function Contact() {
  return (
    <div className="container-app space-y-6 py-6">
      <header>
        <h1 className="text-2xl font-black text-slate-900 sm:text-3xl">Nous contacter</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600 sm:text-base">
          Une question sur une annonce, un doute ou besoin d’aide ? L’équipe de {SITE_NAME} vous
          répond rapidement.
        </p>
      </header>

      {/* ---------------------------- Coordonnées --------------------------- */}
      <section className="card space-y-4 p-5">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-700">
            <IconWhatsApp className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-semibold text-slate-900">WhatsApp</p>
            <a
              href={adminWhatsappLink()}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-brand-700 hover:underline"
            >
              {ADMIN_WHATSAPP}
            </a>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-slate-600">
            <IconMail className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-semibold text-slate-900">E-mail</p>
            <a href={`mailto:${ADMIN_EMAIL}`} className="text-sm text-brand-700 hover:underline">
              {ADMIN_EMAIL}
            </a>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-slate-600">
            <IconMapPin className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-semibold text-slate-900">Localisation</p>
            <p className="text-sm text-slate-500">Bénin — assistance principalement via WhatsApp</p>
          </div>
        </div>
      </section>

      {/* --------------------------- Bouton WhatsApp ------------------------ */}
      <a
        href={adminWhatsappLink('Bonjour LAKERS STORE, j’ai une question.')}
        target="_blank"
        rel="noopener noreferrer"
        className="btn-primary w-full"
      >
        <IconWhatsApp className="h-5 w-5" />
        Discuter sur WhatsApp
      </a>

      {/* ------------------------ Lien vers "Comment ça marche" ------------- */}
      <p className="text-center text-sm text-slate-500">
        Vous ne savez pas par où commencer ?{' '}
        <Link to="/comment-ca-marche" className="font-semibold text-brand-700 hover:underline">
          Comment ça marche
        </Link>
      </p>

      {/* ---------------------------- Sécurité ----------------------------- */}
      <Alert type="warning">Ne payez jamais avant d’avoir vu le téléphone.</Alert>
    </div>
  )
}
