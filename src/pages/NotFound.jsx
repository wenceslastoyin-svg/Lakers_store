// Page 404 affichée quand aucune route ne correspond à l'URL

import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="container-app flex flex-col items-center justify-center gap-4 py-20 text-center">
      <p className="text-5xl font-black text-brand-600">404</p>
      <h1 className="text-2xl font-black text-slate-900">Page introuvable</h1>
      <p className="max-w-md text-sm text-slate-500">
        Désolé, la page que vous recherchez n’existe pas ou a été déplacée.
      </p>
      <Link to="/" className="btn-primary">
        Retour à l’accueil
      </Link>
    </div>
  )
}
