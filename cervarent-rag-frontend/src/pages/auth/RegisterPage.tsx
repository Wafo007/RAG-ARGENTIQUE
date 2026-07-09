import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '../../components/auth/AuthLayout';
import { authApi } from '../../services/authApi';
import { useAuth } from '../../context/AuthContext';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { setAuthUser } = useAuth();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    // Validation cote client miroir de la validation backend (@Size min=8, etc.)
    // pour un retour immediat sans attendre l'aller-retour reseau
    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }

    setLoading(true);
    try {
      const response = await authApi.register({ username, email, password });
      setAuthUser(response);
      navigate('/chat');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout title="Créer un compte" subtitle="Rejoignez CERVARENT AI">
      <form className="auth-form" onSubmit={handleSubmit}>
        {error && <div className="auth-form__error">{error}</div>}

        <div>
          <label htmlFor="username">Nom d'utilisateur</label>
          <input
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            minLength={3}
            autoFocus
          />
        </div>

        <div>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div>
          <label htmlFor="password">Mot de passe</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
          />
        </div>

        <button type="submit" disabled={loading}>
          {loading ? 'Création...' : 'Créer mon compte'}
        </button>
      </form>

      <div className="auth-layout__links">
        <span />
        <Link to="/login">Déjà un compte ? Se connecter</Link>
      </div>
    </AuthLayout>
  );
}