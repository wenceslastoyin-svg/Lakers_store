/** @type {import('tailwindcss').Config} */
// Thème : fond clair, vert principal, touches de jaune et de rouge
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Couleur principale : vert (rassurant)
        brand: {
          50: '#eefdf3',
          100: '#d6f9e3',
          200: '#b0f1ca',
          300: '#7ce4a8',
          400: '#41cf80',
          500: '#17b45f',
          600: '#0a914c',
          700: '#0a733f',
          800: '#0b5b34',
          900: '#0a4b2d'
        },
        // Touche jaune (accent / prix)
        sun: {
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706'
        },
        // Touche rouge (alerte / anti-arnaque)
        alert: {
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'Segoe UI', 'Roboto', 'sans-serif']
      },
      boxShadow: {
        card: '0 2px 10px rgba(16, 24, 40, 0.06)'
      },
      keyframes: {
        // Apparition douce des cartes et des sections
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        // Balayage lumineux des squelettes de chargement
        shimmer: {
          '100%': { transform: 'translateX(100%)' }
        }
      },
      animation: {
        'fade-in-up': 'fade-in-up 0.35s ease-out both',
        shimmer: 'shimmer 1.6s infinite'
      }
    }
  },
  plugins: []
}
