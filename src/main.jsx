import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import './index.css'

// Point d'entrée de l'application
// Le site peut être servi dans un sous-dossier (GitHub Pages : /Lakers_store/).
// On aligne le routeur sur la base définie par Vite pour que les pages
// correspondent, que l'on soit à la racine ou dans un sous-dossier.
const basename = import.meta.env.BASE_URL.replace(/\/$/, '')

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter basename={basename}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
)
