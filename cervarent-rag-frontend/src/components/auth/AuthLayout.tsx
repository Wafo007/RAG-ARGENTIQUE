import type { ReactNode } from 'react';
import { Sparkles } from 'lucide-react';
import './AuthLayout.css';

/** Habillage visuel commun aux pages Login/Register */
export default function AuthLayout({ title, subtitle, children }: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="auth-layout">
      <div className="auth-layout__card">
        <div className="auth-layout__icon">
          <Sparkles size={28} />
        </div>
        <h1>{title}</h1>
        <p className="auth-layout__subtitle">{subtitle}</p>
        {children}
      </div>
    </div>
  );
}