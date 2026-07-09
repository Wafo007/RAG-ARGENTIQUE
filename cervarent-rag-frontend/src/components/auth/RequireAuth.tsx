import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

/** Protege une route : redirige vers /login si personne n'est connecte */
export default function RequireAuth({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) return null; // evite un flash de redirection pendant la lecture du localStorage
  if (!user) return <Navigate to="/login" replace />;

  return <>{children}</>;
}