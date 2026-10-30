// Routes de l'application LAKERS STORE

import { Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import { AdminRoute, ProtectedRoute } from './components/ProtectedRoute'
import { FavoritesProvider } from './context/FavoritesContext'

import Home from './pages/Home'
import Catalogue from './pages/Catalogue'
import PhoneDetail from './pages/PhoneDetail'
import Register from './pages/Register'
import Login from './pages/Login'
import Sell from './pages/Sell'
import MyListings from './pages/MyListings'
import MyRequests from './pages/MyRequests'
import Favorites from './pages/Favorites'
import HowItWorks from './pages/HowItWorks'
import Contact from './pages/Contact'
import Admin from './pages/Admin'
import PaymentResult from './pages/PaymentResult'
import NotFound from './pages/NotFound'

export default function App() {
  return (
    <FavoritesProvider>
      <Layout>
        <Routes>
          {/* Pages publiques */}
          <Route path="/" element={<Home />} />
          <Route path="/catalogue" element={<Catalogue />} />
          <Route path="/telephone/:id" element={<PhoneDetail />} />
          <Route path="/comment-ca-marche" element={<HowItWorks />} />
          <Route path="/contact" element={<Contact />} />

          {/* Comptes */}
          <Route path="/inscription" element={<Register />} />
          <Route path="/connexion" element={<Login />} />

          {/* Pages réservées aux utilisateurs connectés */}
          <Route
            path="/vendre"
            element={
              <ProtectedRoute>
                <Sell />
              </ProtectedRoute>
            }
          />
          <Route
            path="/mes-annonces"
            element={
              <ProtectedRoute>
                <MyListings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/mes-demandes"
            element={
              <ProtectedRoute>
                <MyRequests />
              </ProtectedRoute>
            }
          />
          <Route
            path="/favoris"
            element={
              <ProtectedRoute>
                <Favorites />
              </ProtectedRoute>
            }
          />

          {/* Retour de paiement FedaPay */}
          <Route path="/paiement/:requestId" element={<PaymentResult />} />

          {/* Espace administrateur */}
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <Admin />
              </AdminRoute>
            }
          />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </Layout>
    </FavoritesProvider>
  )
}
