import { Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import PublicationsPage from './pages/PublicationsPage';
import RagSearchPage from './pages/RagSearchPage';
import ContactPage from './pages/ContactPage';
import PlaceholderPage from './pages/PlaceholderPage';

/**
 * Point d'entrée des routes de l'application.
 *
 * - "/"                          : page d'accueil
 * - "/publications"              : bibliothèque + recherche RAG (vue principale)
 * - "/publications/recherche-rag": recherche RAG seule (lien de la sidebar)
 * - "/contact"                   : page de contact
 * - autres liens du menu         : pages "à venir"
 */
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/publications" element={<PublicationsPage />} />
      <Route path="/publications/recherche-rag" element={<RagSearchPage />} />
      <Route path="/contact" element={<ContactPage />} />
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
    </Routes>
  );
}
