import { Link } from 'react-router-dom';
import { Sparkles, BookOpen, Users, Layers } from 'lucide-react';
import Layout from '../components/Layout';
import './HomePage.css';

/**
 * Page d'accueil du site CERVARENT.
 * Présente le centre de recherche et oriente vers la bibliothèque
 * de publications et la recherche augmentée par IA.
 */
export default function HomePage() {
  return (
    <Layout>
      <section className="home-hero">
        <span className="home-hero__eyebrow">Centre de recherche</span>
        <h1>
          CERVARENT — Centre de recherche en sciences appliquées
          <br />
          au service du <span>développement durable</span>
        </h1>
        <p>
          Découvrez les travaux de nos équipes, explorez notre bibliothèque scientifique
          et interrogez nos publications grâce à la recherche augmentée par IA.
        </p>
        <div className="home-hero__actions">
          <Link to="/publications" className="home-hero__btn home-hero__btn--primary">
            <BookOpen size={18} />
            Voir les publications
          </Link>
          <Link to="/publications/recherche-rag" className="home-hero__btn home-hero__btn--ghost">
            <Sparkles size={18} />
            Recherche augmentée par IA
          </Link>
        </div>
      </section>

      <section className="home-grid">
        <article className="home-card">
          <Layers size={22} />
          <h3>Axes &amp; Unités</h3>
          <p>Les domaines de recherche et unités qui structurent les travaux du centre.</p>
        </article>
        <article className="home-card">
          <Users size={22} />
          <h3>Membres</h3>
          <p>Chercheurs, doctorants et collaborateurs impliqués dans nos projets.</p>
        </article>
        <article className="home-card">
          <BookOpen size={22} />
          <h3>Publications</h3>
          <p>Articles, thèses et rapports indexés et consultables via la recherche IA.</p>
        </article>
        <article className="home-card">
          <Sparkles size={22} />
          <h3>Recherche RAG</h3>
          <p>Posez une question en langage naturel et obtenez une réponse sourcée.</p>
        </article>
      </section>
    </Layout>
  );
}
