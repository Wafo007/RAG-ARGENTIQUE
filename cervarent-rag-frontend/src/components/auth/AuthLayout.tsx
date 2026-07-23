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
        <img src="logo-mark.png" alt="logo du cervarent"
          style= {{
            width: '30%',
            maxWidth: '200px',
            height: 'auto',
            borderRadius: '100%',
            objetFit: 'cover'
          }}
        />
        <h1>{title}</h1>
        <p className="auth-layout__subtitle">{subtitle}</p>
        {children}
      </div>
    </div>
  );
}