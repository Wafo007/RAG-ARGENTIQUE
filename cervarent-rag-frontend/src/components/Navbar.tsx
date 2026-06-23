import { Leaf, LogIn } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import './Navbar.css';

/**
 * Barre de navigation principale (en haut de page).
 *
 * Reprend l'identité visuelle CERVARENT : logo + nom du centre à gauche,
 * liens de navigation au centre, bouton "Se connecter" à droite.
 */
const NAV_LINKS = [
  { label: 'Accueil', to: '/' },
  { label: 'Axes & Unités', to: '/axes' },
  { label: 'Membres', to: '/membres' },
  { label: 'Publications', to: '/publications' },
  { label: 'Actualités', to: '/actualites' },
  { label: 'À propos', to: '/a-propos' },
];

export default function Navbar() {
  return (
    <header className="navbar">
      <div className="navbar__brand">
        <span className="navbar__logo" aria-hidden="true">
          <Leaf size={22} strokeWidth={2.5} />
        </span>
        <div className="navbar__brand-text">
          <strong>CERVARENT</strong>
          <span>Centre de recherche</span>
        </div>
      </div>

      <nav className="navbar__links" aria-label="Navigation principale">
        {NAV_LINKS.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              isActive ? 'navbar__link navbar__link--active' : 'navbar__link'
            }
          >
            {link.label}
          </NavLink>
        ))}
      </nav>

      <button className="navbar__login" type="button">
        <LogIn size={16} />
        Se connecter
      </button>
    </header>
  );
}
