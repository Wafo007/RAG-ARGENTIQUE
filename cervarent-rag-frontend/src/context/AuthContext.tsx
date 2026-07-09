import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { AuthUser } from '../types/auth';

const STORAGE_KEY = 'cervarent_auth_user';

interface AuthContextValue {
  user: AuthUser | null;
  /** Enregistre l'utilisateur connecte (appele apres login/register reussi) */
  setAuthUser: (user: AuthUser) => void;
  /** Deconnecte l'utilisateur (efface le token) */
  logout: () => void;
  /** Vrai tant qu'on n'a pas fini de lire le localStorage au demarrage */
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * Fournit l'utilisateur connecte a toute l'application, et persiste
 * la session dans le localStorage pour survivre a un rechargement de page.
 *
 * Pourquoi un Context plutot que de repasser le user en props partout ?
 * -> Le username doit etre accessible depuis le header (salutation "Bonjour X"),
 *    le formulaire de feedback, et l'intercepteur axios (voir apiClient.ts) :
 *    autant centraliser l'etat plutot que de le faire descendre a travers
 *    plusieurs niveaux de composants qui n'en ont pas besoin eux-memes.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Chargement de la session existante au tout premier rendu
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setUser(JSON.parse(stored) as AuthUser);
      } catch {
        localStorage.removeItem(STORAGE_KEY); // JSON corrompu, on ignore
      }
    }
    setIsLoading(false);
  }, []);

  function setAuthUser(newUser: AuthUser) {
    setUser(newUser);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newUser));
  }

  function logout() {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
  }

  return (
    <AuthContext.Provider value={{ user, setAuthUser, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

/** Hook d'acces au contexte d'authentification, a utiliser dans les composants */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth doit etre utilise a l\'interieur de <AuthProvider>');
  }
  return context;
}