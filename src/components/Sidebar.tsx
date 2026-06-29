import { BookOpen, Sparkles, Mail, Home } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import './Sidebar.css';

/**
 * Barre latérale de la section "Publications".
 *
 * Affiche le titre de la section et les liens de navigation interne :
 * - Toutes les publications (bibliothèque)
 * - Recherche RAG (recherche augmentée par IA)
 * - Contact
 * - Retour à l'accueil
 */
const LINKS = [
  { label: 'Toutes les publications', to: '/publications', icon: BookOpen },
  { label: 'Recherche RAG', to: '/publications/recherche-rag', icon: Sparkles },
  { label: 'Contact', to: '/contact', icon: Mail },
];

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar__header">
        <div className="sidebar__icon" aria-hidden="true">
          <BookOpen size={26} />
        </div>
        <h2>Publications</h2>
        <p>Bibliothèque scientifique</p>
      </div>

      <nav className="sidebar__nav" aria-label="Navigation publications">
        {LINKS.map(({ label, to, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end
            className={({ isActive }) =>
              isActive ? 'sidebar__link sidebar__link--active' : 'sidebar__link'
            }
          >
            <Icon size={18} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar__footer">
        <NavLink to="/" className="sidebar__link">
          <Home size={18} />
          <span>Retour à l'accueil</span>
        </NavLink>
      </div>
    </aside>
  );
}
