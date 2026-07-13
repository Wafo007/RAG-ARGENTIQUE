import { Routes, Route, Navigate } from 'react-router-dom';
import HomePage from './pages/HomePage';
import PublicationsPage from './pages/PublicationsPage';
import RagSearchPage from './pages/RagSearchPage';
import ContactPage from './pages/ContactPage';
import PlaceholderPage from './pages/PlaceholderPage';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import RequireAuth from './components/auth/RequireAuth';

/**
 * Point d'entrée des routes de l'application.
 *
 * - "/"                          : page d'accueil (publique)
 * - "/login", "/register"        : authentification (publiques)
 * - "/publications"              : présentation publique (publique)
 * - "/publications/recherche-rag": chat RAG (PROTÉGÉ — nécessite une connexion)
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
      <Route path="/contact" element={<ContactPage />} />

      {/* Authentification */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Chat RAG : protégé, redirige vers /login si non connecté.
          Une seule déclaration de cette route (avant, elle existait en
          double : une fois publique puis une fois protégée — React Router
          ne retenait que la première, publique, rendant la protection
          inopérante). */}
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
