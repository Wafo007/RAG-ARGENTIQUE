import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import './styles/global.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* ThemeProvider doit envelopper toute l'application : il pose l'attribut
        data-theme sur <html> dès le premier rendu, avant même que les pages
        ne s'affichent, pour éviter un "flash" de thème clair avant bascule. */}
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>   
      </BrowserRouter>
    </ThemeProvider>
  </StrictMode>
);
