import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Configuration Vite : base du projet React + Tailwind
// VITE_BASE_PATH permet d'adapter le chemin public lors d'un déploiement
// sur un sous-dossier (ex. GitHub Pages : /lakers-store/).
export default defineConfig({
  base: process.env.VITE_BASE_PATH || '/',
  plugins: [react()],
  server: {
    port: 5173,
    host: true
  }
})
