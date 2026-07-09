import { Routes, Route, Navigate } from 'react-router-dom';
import HomePage from './pages/HomePage';
import PublicationsPage from './pages/PublicationsPage';
import RagSearchPage from './pages/RagSearchPage';
import ContactPage from './pages/ContactPage';
import PlaceholderPage from './pages/PlaceholderPage';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import RequireAuth from './components/auth/RequireAuth';

/**
 * Point d'entrée des routes de l'application.
 *
 * - "/"                          : page d'accueil (publique)
 * - "/login", "/register", ...   : authentification (publiques)
 * - "/chat"                      : chat RAG (protégé, nécessite une connexion)
 * - "/publications"              : bibliothèque + recherche RAG (publique)
 * - "/publications/recherche-rag": recherche RAG seule (publique)
 * - "/contact"                   : page de contact (publique)
 * - autres liens du menu         : pages "à venir"
 * - toute route inconnue         : redirection vers l'accueil
 */
export default function App() {
  return (
    <Routes>
      {/* Pages publiques du site vitrine */}
      <Route path="/" element={<HomePage />} />
      <Route path="/publications" element={<PublicationsPage />} />
      {/*<Route path="/publications/recherche-rag" element={<RagSearchPage />} />*/}
      <Route path="/publications/recherche-rag" element={<RagSearchPage />} />
      <Route path="/contact" element={<ContactPage />} />

      {/* Authentification */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      {/* Chat RAG : protégé, redirige vers /login si non connecté */}
      <Route
        path="/publications/recherche-rag"
        element={
          <RequireAuth>
            <RagSearchPage />
          </RequireAuth>
        }
      />

      {/* Pages "à venir" */}
      <Route
        path="/axes"
        element={
          <PlaceholderPage
            title="Axes & Unités"
            description="Présentation des axes de recherche et des unités du CERVARENT. Cette section sera bientôt disponible."
          />
        }
      />
      <Route
        path="/membres"
        element={
          <PlaceholderPage
            title="Membres"
            description="Annuaire des chercheurs, doctorants et collaborateurs du centre. Cette section sera bientôt disponible."
          />
        }
      />
      <Route
        path="/actualites"
        element={
          <PlaceholderPage
            title="Actualités"
            description="Annonces, événements et nouvelles du centre de recherche. Cette section sera bientôt disponible."
          />
        }
      />
      <Route
        path="/a-propos"
        element={
          <PlaceholderPage
            title="À propos"
            description="Mission, histoire et valeurs du CERVARENT. Cette section sera bientôt disponible."
          />
        }
      />

      {/* Catch-all : toujours en dernier, une seule fois */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}