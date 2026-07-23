import { Leaf, LogIn, LogOut, Moon, Sun } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

/**
 * Barre de navigation principale (en haut de page).
 *
 * Reprend l'identité visuelle CERVARENT : logo + nom du centre à gauche,
 * liens de navigation au centre, bouton mode sombre + statut de connexion
 * à droite (bouton "Se connecter" si non connecté, salutation + déconnexion
 * sinon).
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
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/');
  }

  return (
    <header className="navbar">
      <div className="navbar__brand">
        <img src="logo-mark.png"
          style= {{
            width: '15%',
            maxWidth: '200px',
            height: 'auto',
            borderRadius: '100%',
            objetFit: 'cover'
          }}
        />
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

      <div className="navbar__actions">
        <button
          type="button"
          className="navbar__theme-toggle"
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Activer le mode clair' : 'Activer le mode sombre'}
          title={theme === 'dark' ? 'Mode clair' : 'Mode sombre'}
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {user ? (
          <div className="navbar__user">
            <span className="navbar__username">{user.username}</span>
            <button
              type="button"
              className="navbar__login"
              onClick={handleLogout}
              title="Se déconnecter"
            >
              <LogOut size={16} />
              Déconnexion
            </button>
          </div>
        ) : (
          <button type="button" className="navbar__login" onClick={() => navigate('/login')}>
            <LogIn size={16} />
            Se connecter
          </button>
        )}
      </div>
    </header>
  );
}
