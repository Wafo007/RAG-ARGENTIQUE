import type { ReactNode } from 'react';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import './Layout.css';

interface LayoutProps {
  /** Si vrai, affiche la barre latérale "Publications" (sinon pleine largeur) */
  withSidebar?: boolean;
  children: ReactNode;
}

/**
 * Structure commune de page : barre de navigation en haut,
 * puis éventuellement une barre latérale + le contenu principal.
 */
export default function Layout({ withSidebar = false, children }: LayoutProps) {
  return (
    <div className="layout">
      <Navbar />
      <div className="layout__body">
        {withSidebar && <Sidebar />}
        <main className="layout__content">{children}</main>
      </div>
    </div>
  );
}
