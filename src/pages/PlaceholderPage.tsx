import { Construction } from 'lucide-react';
import Layout from '../components/Layout';
import './PlaceholderPage.css';

interface PlaceholderPageProps {
  title: string;
  description: string;
}

/**
 * Page générique "en construction" pour les sections du menu principal
 * (Axes & Unités, Membres, Actualités, À propos) qui n'ont pas encore
 * d'endpoint backend dédié.
 */
export default function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <Layout>
      <div className="placeholder">
        <div className="placeholder__icon">
          <Construction size={28} />
        </div>
        <h1>{title}</h1>
        <p>{description}</p>
        <span className="placeholder__tag">Contenu à venir</span>
      </div>
    </Layout>
  );
}
