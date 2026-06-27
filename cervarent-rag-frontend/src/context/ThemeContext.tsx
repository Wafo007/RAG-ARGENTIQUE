import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

type Theme = 'light' | 'dark';

const STORAGE_KEY = 'cervarent-theme';

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/**
 * Détermine le thème initial au chargement de l'application :
 * 1. préférence déjà enregistrée par l'utilisateur (localStorage) si elle existe ;
 * 2. sinon préférence système (media query prefers-color-scheme) ;
 * 3. sinon clair par défaut.
 */
function getInitialTheme(): Theme {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'light' || stored === 'dark') return stored;

  const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
  return prefersDark ? 'dark' : 'light';
}

/**
 * Fournit le thème (clair/sombre) à toute l'application et le persiste.
 *
 * Pourquoi un Context plutôt qu'un simple useState dans le composant Navbar ?
 * → Le thème doit être lu par <html> (pour poser l'attribut data-theme) et
 *   potentiellement par n'importe quel composant à l'avenir (ex : un futur
 *   sélecteur de thème dans une page "Paramètres"). Un Context évite de faire
 *   redescendre cette information par props sur toute la profondeur de l'arbre.
 *
 * Comment le thème est-il appliqué visuellement ?
 * → On pose l'attribut data-theme sur <html>. C'est ce sélecteur que les
 *   tokens de styles/global.css utilisent pour redéfinir les variables CSS
 *   (--color-bg, --color-text, --color-surface...). Comme tous les composants
 *   du projet consomment déjà ces variables plutôt que des couleurs codées en
 *   dur, le mode sombre s'applique automatiquement à TOUTE l'application sans
 *   qu'il soit nécessaire de modifier un seul composant existant.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  function toggleTheme() {
    setTheme((current) => (current === 'light' ? 'dark' : 'light'));
  }

  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>;
}

/** Hook d'accès au thème courant et à la fonction pour le basculer */
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme doit être utilisé à l'intérieur d'un <ThemeProvider>");
  }
  return context;
}
