import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import AuthLayout from '../../components/auth/AuthLayout';
import { authApi } from '../../services/authApi';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      // Le backend renvoie TOUJOURS le meme message generique (email existe ou non)
      const response = await authApi.forgotPassword({ email });
      setMessage(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Mot de passe oublié"
      subtitle="Indiquez l'email associé à votre compte"
    >
      <form className="auth-form" onSubmit={handleSubmit}>
        {error && <div className="auth-form__error">{error}</div>}
        {message && <div className="auth-form__success">{message}</div>}

        <div>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
          />
        </div>

        <button type="submit" disabled={loading}>
          {loading ? 'Envoi...' : 'Envoyer le lien de réinitialisation'}
        </button>
      </form>

      <div className="auth-layout__links">
        <Link to="/login">Retour à la connexion</Link>
      </div>
    </AuthLayout>
  );
}